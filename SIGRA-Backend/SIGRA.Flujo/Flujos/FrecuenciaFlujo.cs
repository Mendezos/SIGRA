using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using Microsoft.Extensions.Configuration;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Servicios;
using SIGRA.Flujo.Utilidades;
using System.Net;

namespace SIGRA.Flujo.Flujos;

public class FrecuenciaFlujo : IFrecuenciaFlujo
{
    private const string ModuloAuditoria = "Frecuencias";
    private const string MensajeSinCliente = "Debe indicar el cliente vinculado a la solicitud";
    private const string MensajeSinRepetidora = "Debe seleccionar la repetidora asociada a la solicitud";
    private const string MensajeDatosTecnicos = "Debe completar los datos técnicos obligatorios de la solicitud";
    private const string MensajeSolicitudInexistente = "La solicitud indicada no existe.";
    private const int MaximoDocumentosPorSolicitud = 10;
    private const string EstadoInicial = "En solicitud";
    private const string EstadoCancelada = "Cancelada";
    private const string MensajeRenovarCancelada = "No es posible renovar una frecuencia cancelada";
    private const int MaximoIntentosEnvio = 5;

    private static readonly string[] Bandas = { "VHF", "UHF", "700 MHz", "800 MHz", "900 MHz" };
    private static readonly string[] TiposDocumento = { "Formulario presentado", "Acuse de recibo", "Otro" };

    // Evita que el proceso automático y una verificación manual envíen el mismo correo a la vez.
    private static readonly SemaphoreSlim VerificacionEnCurso = new(1, 1);

    private readonly IFrecuenciaDA _frecuenciaDA;
    private readonly IAuditoriaDA _auditoriaDA;
    private readonly IEmailService _email;
    private readonly string _frontendBaseUrl;

    public FrecuenciaFlujo(IFrecuenciaDA frecuenciaDA, IAuditoriaDA auditoriaDA, IEmailService email, IConfiguration configuracion)
    {
        _frecuenciaDA = frecuenciaDA;
        _auditoriaDA = auditoriaDA;
        _email = email;
        _frontendBaseUrl = (configuracion["Frontend:BaseUrl"] ?? "http://localhost:5173").TrimEnd('/');
    }

    public Task<List<ClienteDto>> ListarClientesAsync() => _frecuenciaDA.ListarClientesAsync();

    public Task<List<VendedorDto>> ListarVendedoresAsync() => _frecuenciaDA.ListarVendedoresAsync();

    public Task<List<RepetidoraClienteDto>> ListarRepetidorasDeClienteAsync(int idCliente) =>
        _frecuenciaDA.ListarRepetidorasDeClienteAsync(idCliente);

    // ---------- RCFR-001: registro de la solicitud ----------
    public async Task<SolicitudFrecuenciaDto> RegistrarSolicitudAsync(RegistrarSolicitudDto dto, int? idVendedorSesion, int idUsuario)
    {
        if (dto.IdCliente is null or <= 0)
            throw new ReglaNegocioException(MensajeSinCliente);

        if (dto.IdEquipo is null or <= 0)
            throw new ReglaNegocioException(MensajeSinRepetidora);

        var frecuencia = Normalizar(dto.Frecuencia);
        var banda = Normalizar(dto.Banda);
        var potencia = Normalizar(dto.Potencia);
        var zona = Normalizar(dto.ZonaCobertura);

        var faltantes = new List<string>();
        if (frecuencia is null) faltantes.Add("Frecuencia solicitada");
        if (banda is null) faltantes.Add("Banda");
        if (potencia is null) faltantes.Add("Potencia");
        if (zona is null) faltantes.Add("Zona geográfica de cobertura");
        if (faltantes.Count > 0)
            throw new ValidacionException(MensajeDatosTecnicos, faltantes);

        if (dto.FechaPresentacion is null)
            throw new ReglaNegocioException("Debe indicar la fecha de presentación del trámite ante el gobierno");

        if (dto.FechaPresentacion.Value.Date > DateTime.Today)
            throw new ReglaNegocioException("La fecha de presentación del trámite no puede ser futura.");

        if (frecuencia!.Length > 30 || potencia!.Length > 30 || zona!.Length > 200)
            throw new ReglaNegocioException("Alguno de los datos excede la longitud permitida.");

        if (!frecuencia.Any(char.IsDigit))
            throw new ReglaNegocioException("La frecuencia solicitada debe indicar un valor numérico (por ejemplo 450.125 MHz).");

        if (!potencia.Any(char.IsDigit))
            throw new ReglaNegocioException("La potencia debe indicar un valor numérico (por ejemplo 40 W).");

        banda = Bandas.FirstOrDefault(b => string.Equals(b, banda, StringComparison.OrdinalIgnoreCase))
            ?? throw new ReglaNegocioException($"La banda debe ser una de las siguientes: {string.Join(", ", Bandas)}.");

        var cliente = (await _frecuenciaDA.ListarClientesAsync()).FirstOrDefault(c => c.IdCliente == dto.IdCliente)
            ?? throw new ReglaNegocioException("El cliente indicado no existe o está inactivo.");

        var repetidora = (await _frecuenciaDA.ListarRepetidorasDeClienteAsync(cliente.IdCliente)).FirstOrDefault(r => r.IdEquipo == dto.IdEquipo)
            ?? throw new ReglaNegocioException("La repetidora seleccionada no está asociada a un contrato de alquiler del cliente indicado.");

        // Si es una renovación, debe ser del mismo cliente y repetidora de la frecuencia que se renueva.
        SolicitudFrecuenciaDto? origen = null;
        if (dto.IdSolicitudOrigen is not null)
        {
            origen = await ObtenerSolicitudAsync(dto.IdSolicitudOrigen.Value, idVendedorSesion);

            if (origen.Estado == EstadoCancelada)
                throw new ReglaNegocioException(MensajeRenovarCancelada);

            if (origen.IdSolicitudRenovacion is not null)
                throw new ReglaNegocioException($"La frecuencia ya tiene una renovación iniciada (SF-{origen.IdSolicitudRenovacion:0000}).");

            if (origen.Estado is not ("Vigente" or "Por renovar" or "Vencida"))
                throw new ReglaNegocioException("Solo se puede iniciar la renovación de una frecuencia vigente, por renovar o vencida.");

            if (origen.FechaOtorgamiento is not null && dto.FechaPresentacion.Value.Date < origen.FechaOtorgamiento.Value.Date)
                throw new ReglaNegocioException("La fecha de presentación de la renovación no puede ser anterior a la fecha de otorgamiento de la frecuencia original.");

            if (origen.IdCliente != cliente.IdCliente || origen.IdEquipo != repetidora.IdEquipo)
                throw new ReglaNegocioException("La renovación debe ser del mismo cliente y de la misma repetidora de la frecuencia original.");
        }

        var idVendedor = await ResolverVendedorAsync(idVendedorSesion, dto.IdVendedor ?? origen?.IdVendedor);
        var documentos = ValidarDocumentos(dto.Documentos);

        var idSolicitud = await _frecuenciaDA.InsertarSolicitudAsync(cliente.IdCliente, repetidora.IdEquipo, idVendedor,
            frecuencia, banda, potencia, zona!, dto.FechaPresentacion.Value, origen?.IdSolicitud);

        foreach (var doc in documentos)
            await _frecuenciaDA.InsertarDocumentoAsync(idSolicitud, doc.Tipo, doc.Nombre, doc.NombreArchivo, doc.TipoContenido, doc.Contenido, idUsuario);

        var creada = await ObtenerSolicitudAsync(idSolicitud, null);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "SolicitudFrecuencia", idSolicitud, "SOLICITUD_FRECUENCIA_REGISTRADA",
            $"SF-{idSolicitud:0000}: {cliente.Empresa}, repetidora {repetidora.NumeroSerie}, {frecuencia} ({banda}), {potencia}, {zona}. " +
            $"Vendedor responsable: {creada.Vendedor}. {documentos.Count} documento(s) adjunto(s)" +
            (origen is null ? string.Empty : $". Renovación de SF-{origen.IdSolicitud:0000}"));

        if (origen is not null)
            await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "SolicitudFrecuencia", origen.IdSolicitud, "RENOVACION_FRECUENCIA_INICIADA",
                $"SF-{origen.IdSolicitud:0000}: {cliente.Empresa}, {origen.Frecuencia}. Renovación SF-{idSolicitud:0000} presentada el {dto.FechaPresentacion.Value:dd/MM/yyyy}. " +
                $"Estado {origen.Estado} -> {(origen.Estado == "Vencida" ? "Vencida" : "En renovación")}");

        return creada;
    }

    private async Task<int> ResolverVendedorAsync(int? idVendedorSesion, int? idVendedorIndicado)
    {
        if (idVendedorSesion is not null)
            return idVendedorSesion.Value;

        if (idVendedorIndicado is null or <= 0)
            throw new ReglaNegocioException("Debe indicar el vendedor responsable de la solicitud");

        var vendedor = (await _frecuenciaDA.ListarVendedoresAsync()).FirstOrDefault(v => v.IdUsuario == idVendedorIndicado)
            ?? throw new ReglaNegocioException("El vendedor indicado no existe o está inactivo.");
        return vendedor.IdUsuario;
    }

    private record DocumentoValidado(string Tipo, string Nombre, string NombreArchivo, string TipoContenido, byte[] Contenido);

    // Valida todos los archivos antes de guardar nada, para no dejar una solicitud a medias.
    private static List<DocumentoValidado> ValidarDocumentos(List<SubirDocumentoDto>? documentos)
    {
        var resultado = new List<DocumentoValidado>();
        if (documentos is null || documentos.Count == 0)
            return resultado;

        if (documentos.Count > MaximoDocumentosPorSolicitud)
            throw new ReglaNegocioException($"Se pueden adjuntar hasta {MaximoDocumentosPorSolicitud} documentos por solicitud.");

        foreach (var doc in documentos)
            resultado.Add(ValidarDocumento(doc));

        return resultado;
    }

    private static DocumentoValidado ValidarDocumento(SubirDocumentoDto doc)
    {
        var etiqueta = Normalizar(doc.NombreArchivo) ?? "archivo";
        try
        {
            var (nombreArchivo, tipoContenido) = ArchivoAdjuntoValidador.Validar(doc.NombreArchivo, doc.Contenido);

            var tipo = Normalizar(doc.TipoDocumento) ?? "Otro";
            tipo = TiposDocumento.FirstOrDefault(t => string.Equals(t, tipo, StringComparison.OrdinalIgnoreCase))
                ?? throw new ReglaNegocioException("El tipo de documento debe ser Formulario presentado, Acuse de recibo u Otro.");

            var nombre = Normalizar(doc.NombreDocumento) ?? Path.GetFileNameWithoutExtension(nombreArchivo);
            if (nombre.Length > 150)
                throw new ReglaNegocioException("El nombre del documento excede la longitud permitida.");

            return new DocumentoValidado(tipo, nombre, nombreArchivo, tipoContenido, doc.Contenido!);
        }
        catch (ReglaNegocioException ex)
        {
            throw new ReglaNegocioException($"{etiqueta}: {ex.Message}");
        }
    }

    // ---------- Consulta ----------
    // ---------- RCFR-006: búsqueda y filtros ----------
    public Task<List<SolicitudFrecuenciaDto>> ListarSolicitudesAsync(string? texto, string? estado, string? cliente, string? zona, int? idVendedor) =>
        _frecuenciaDA.ListarSolicitudesAsync(
            EscaparComodines(Recortar(texto, 100)),
            Recortar(estado, 30),
            EscaparComodines(Recortar(cliente, 150)),
            EscaparComodines(Recortar(zona, 200)),
            idVendedor);

    private static string? Recortar(string? valor, int maximo)
    {
        var limpio = Normalizar(valor);
        return limpio is not null && limpio.Length > maximo ? limpio[..maximo] : limpio;
    }

    // Lo que escribe la persona se busca literalmente: los caracteres especiales de LIKE ([, % y _) no actúan como comodines.
    private static string? EscaparComodines(string? valor) =>
        valor?.Replace("[", "[[]").Replace("%", "[%]").Replace("_", "[_]");

    // Un vendedor solo puede ver sus propias solicitudes; para él una ajena equivale a una inexistente.
    public async Task<SolicitudFrecuenciaDto> ObtenerSolicitudAsync(int idSolicitud, int? idVendedor)
    {
        var solicitud = await _frecuenciaDA.ObtenerSolicitudAsync(idSolicitud);
        if (solicitud is null || (idVendedor is not null && solicitud.IdVendedor != idVendedor))
            throw new ReglaNegocioException(MensajeSolicitudInexistente);
        return solicitud;
    }

    // ---------- RCFR-002: otorgamiento de la frecuencia ----------
    public async Task<SolicitudFrecuenciaDto> OtorgarSolicitudAsync(int idSolicitud, OtorgarFrecuenciaDto dto, int? idVendedor, int idUsuario)
    {
        var solicitud = await ObtenerSolicitudAsync(idSolicitud, idVendedor);

        if (solicitud.Estado != EstadoInicial)
            throw new ReglaNegocioException($"Solo se puede registrar el otorgamiento de una solicitud en estado \"{EstadoInicial}\".");

        var resolucion = Normalizar(dto.NumeroResolucion);
        if (resolucion is null)
            throw new ReglaNegocioException("Debe ingresar el número de resolución o expediente gubernamental");

        if (resolucion.Length > 100)
            throw new ReglaNegocioException("El número de resolución o expediente excede la longitud permitida (100 caracteres).");

        if (dto.FechaOtorgamiento is null)
            throw new ReglaNegocioException("Debe indicar la fecha de otorgamiento");

        var fecha = dto.FechaOtorgamiento.Value.Date;
        var fechaSolicitud = (solicitud.FechaPresentacion ?? solicitud.FechaRegistro).Date;
        if (fecha < fechaSolicitud)
            throw new ReglaNegocioException("La fecha de otorgamiento no puede ser anterior a la fecha de solicitud");

        if (fecha > DateTime.Today)
            throw new ReglaNegocioException("La fecha de otorgamiento no puede ser futura.");

        await _frecuenciaDA.OtorgarSolicitudAsync(idSolicitud, fecha, resolucion);

        var otorgada = await ObtenerSolicitudAsync(idSolicitud, null);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "SolicitudFrecuencia", idSolicitud, "FRECUENCIA_OTORGADA",
            $"SF-{idSolicitud:0000}: {solicitud.Empresa}, repetidora {solicitud.NumeroSerie}, {solicitud.Frecuencia}. " +
            $"Estado {EstadoInicial} -> Otorgada -> {otorgada.Estado}. Resolución {resolucion}, otorgada el {fecha:dd/MM/yyyy}, vence el {otorgada.FechaVencimiento:dd/MM/yyyy}");

        if (otorgada.IdSolicitudOrigen is not null)
            await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "SolicitudFrecuencia", otorgada.IdSolicitudOrigen, "FRECUENCIA_RENOVADA",
                $"SF-{otorgada.IdSolicitudOrigen:0000} renovada por SF-{idSolicitud:0000}: nueva resolución {resolucion}, otorgada el {fecha:dd/MM/yyyy}, " +
                $"vence el {otorgada.FechaVencimiento:dd/MM/yyyy}. Se reinicia el ciclo de alertas");

        return otorgada;
    }

    // ---------- RCFR-005: cancelación de la solicitud ----------
    public async Task<SolicitudFrecuenciaDto> CancelarSolicitudAsync(int idSolicitud, CancelarSolicitudDto dto, int? idVendedor, int idUsuario)
    {
        var solicitud = await ObtenerSolicitudAsync(idSolicitud, idVendedor);

        var motivo = Normalizar(dto.Motivo);
        if (motivo is null)
            throw new ReglaNegocioException("Debe indicar el motivo de la cancelación");

        if (motivo.Length > 500)
            throw new ReglaNegocioException("El motivo de la cancelación no puede superar los 500 caracteres.");

        // El procedimiento valida el estado (no se cancela lo ya cancelado ni lo renovado), cierra las alertas pendientes
        // y, si era una renovación en trámite, devuelve la frecuencia original a su ciclo normal.
        await _frecuenciaDA.CancelarSolicitudAsync(idSolicitud, motivo, idUsuario);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "SolicitudFrecuencia", idSolicitud, "SOLICITUD_FRECUENCIA_CANCELADA",
            $"SF-{idSolicitud:0000}: {solicitud.Empresa}, repetidora {solicitud.NumeroSerie}, {solicitud.Frecuencia}. " +
            $"Estado {solicitud.Estado} -> Cancelada. Motivo: {motivo}. Se detuvieron sus alertas de vencimiento");

        return await ObtenerSolicitudAsync(idSolicitud, null);
    }

    // ---------- RCFR-010: bitácora de auditoría de la solicitud ----------
    private static readonly Dictionary<string, string> NombresEvento = new()
    {
        ["SOLICITUD_FRECUENCIA_REGISTRADA"] = "Registro de la solicitud",
        ["DOCUMENTO_SOLICITUD_ADJUNTADO"] = "Documento adjuntado",
        ["FRECUENCIA_OTORGADA"] = "Otorgamiento de la frecuencia",
        ["RENOVACION_FRECUENCIA_INICIADA"] = "Inicio de la renovación",
        ["FRECUENCIA_RENOVADA"] = "Renovación otorgada (frecuencia renovada)",
        ["SOLICITUD_FRECUENCIA_CANCELADA"] = "Cancelación de la solicitud",
        ["ALERTA_VENCIMIENTO_GENERADA"] = "Alerta de vencimiento generada",
        ["ALERTA_VENCIMIENTO_ATENDIDA"] = "Alerta de vencimiento atendida",
        ["FRECUENCIA_VENCIDA"] = "Frecuencia vencida"
    };

    public async Task<AuditoriaSolicitudDto> ObtenerAuditoriaAsync(int idSolicitud)
    {
        var solicitud = await ObtenerSolicitudAsync(idSolicitud, null);
        var eventos = await _frecuenciaDA.ListarAuditoriaAsync(idSolicitud);

        foreach (var evento in eventos)
        {
            evento.Automatico = evento.IdUsuario is null;
            evento.Usuario ??= "Sistema";
            evento.Evento = NombresEvento.TryGetValue(evento.Accion, out var nombre) ? nombre : evento.Accion;
        }

        return new AuditoriaSolicitudDto { Solicitud = solicitud, Eventos = eventos };
    }

    // ---------- RCFR-004: historial de renovaciones ----------
    public async Task<List<CicloFrecuenciaDto>> ObtenerHistorialAsync(int idSolicitud, int? idVendedor)
    {
        await ObtenerSolicitudAsync(idSolicitud, idVendedor);
        return await _frecuenciaDA.ListarHistorialAsync(idSolicitud);
    }

    // ---------- RCFR-003: alertas de vencimiento ----------
    // Lo ejecuta el proceso automático de la API (y el administrador a demanda). Es idempotente: cada alerta se genera una sola vez.
    public async Task<ResultadoVerificacionDto> ProcesarAlertasAsync(bool reintentarTodos = false)
    {
        await VerificacionEnCurso.WaitAsync();
        try
        {
            var (idsAlertas, idsVencidas) = await _frecuenciaDA.EvaluarAlertasAsync(DateTime.Today);

            foreach (var idSolicitud in idsVencidas)
            {
                var s = await _frecuenciaDA.ObtenerSolicitudAsync(idSolicitud);
                if (s is null) continue;
                await _auditoriaDA.RegistrarAsync(null, ModuloAuditoria, "SolicitudFrecuencia", idSolicitud, "FRECUENCIA_VENCIDA",
                    $"SF-{idSolicitud:0000}: {s.Empresa}, {s.Frecuencia} venció el {s.FechaVencimiento:dd/MM/yyyy} sin renovarse. Estado -> Vencida");
            }

            foreach (var idAlerta in idsAlertas)
            {
                var a = (await _frecuenciaDA.ListarAlertasAsync(idAlerta, null, null)).FirstOrDefault();
                if (a is null) continue;
                await _auditoriaDA.RegistrarAsync(null, ModuloAuditoria, "SolicitudFrecuencia", a.IdSolicitud, "ALERTA_VENCIMIENTO_GENERADA",
                    $"SF-{a.IdSolicitud:0000}: alerta {DescripcionTipo(a.Tipo)} para {a.Vendedor} ({a.Empresa}, {a.Frecuencia}, vence {a.FechaVencimiento:dd/MM/yyyy}, {a.DiasRestantes} días)");
            }

            int enviados = 0, fallidos = 0;
            foreach (var pendiente in await _frecuenciaDA.ListarAlertasPorEnviarAsync(reintentarTodos ? int.MaxValue : MaximoIntentosEnvio))
            {
                try
                {
                    if (string.IsNullOrWhiteSpace(pendiente.CorreoVendedor))
                        throw new InvalidOperationException("El vendedor responsable no tiene correo registrado.");

                    await _email.EnviarAsync(pendiente.CorreoVendedor, pendiente.Vendedor, AsuntoAlerta(pendiente), CuerpoAlerta(pendiente));
                    await _frecuenciaDA.MarcarEnvioAlertaAsync(pendiente.IdAlerta, true, null);
                    enviados++;
                }
                catch (Exception ex)
                {
                    await _frecuenciaDA.MarcarEnvioAlertaAsync(pendiente.IdAlerta, false, ex.Message);
                    fallidos++;
                }
            }

            return new ResultadoVerificacionDto
            {
                AlertasGeneradas = idsAlertas.Count,
                FrecuenciasVencidas = idsVencidas.Count,
                CorreosEnviados = enviados,
                CorreosFallidos = fallidos,
                Mensaje = $"Verificación terminada: {idsAlertas.Count} alerta(s) generada(s), {idsVencidas.Count} frecuencia(s) vencida(s), " +
                          $"{enviados} correo(s) enviado(s) y {fallidos} correo(s) con error."
            };
        }
        finally
        {
            VerificacionEnCurso.Release();
        }
    }

    private static string DescripcionTipo(string tipo) => tipo switch
    {
        "Primera" => "de 6 meses",
        "Segunda" => "de 3 meses",
        _ => "final de 30 días (urgente)"
    };

    private static string AsuntoAlerta(AlertaPorEnviarDto a) => a.Tipo switch
    {
        "Primera" => $"Vencimiento de frecuencia en 6 meses - {a.Empresa} ({a.Frecuencia})",
        "Segunda" => $"Recordatorio: la frecuencia vence en 3 meses sin renovación iniciada - {a.Empresa} ({a.Frecuencia})",
        _ => $"URGENTE: la frecuencia vence en {a.DiasRestantes} días - {a.Empresa} ({a.Frecuencia})"
    };

    private string CuerpoAlerta(AlertaPorEnviarDto a)
    {
        string H(string? texto) => WebUtility.HtmlEncode(texto ?? string.Empty);
        var intro = a.Tipo switch
        {
            "Primera" => "Primera alerta (<strong>6 meses</strong>): se acerca el vencimiento de una frecuencia asignada a uno de tus clientes. Es el momento de iniciar el proceso de renovación ante la entidad gubernamental.",
            "Segunda" => "Faltan aproximadamente <strong>3 meses</strong> para el vencimiento de la siguiente frecuencia y todavía no hay una renovación iniciada.",
            _ => "<strong style=\"color:#C0392B\">ALERTA URGENTE:</strong> faltan 30 días para el vencimiento de la siguiente frecuencia y no hay una renovación iniciada."
        };

        return $"<p>Hola {H(a.Vendedor)},</p><p>{intro}</p>" +
               "<ul>" +
               $"<li><strong>Cliente:</strong> {H(a.Empresa)}</li>" +
               $"<li><strong>Frecuencia asignada:</strong> {H(a.Frecuencia)}{(string.IsNullOrWhiteSpace(a.Banda) ? string.Empty : " (" + H(a.Banda) + ")")}</li>" +
               $"<li><strong>Repetidora:</strong> {H(a.NumeroSerie)}</li>" +
               $"<li><strong>Fecha de vencimiento:</strong> {a.FechaVencimiento:dd/MM/yyyy}</li>" +
               $"<li><strong>Días restantes:</strong> {a.DiasRestantes}</li>" +
               "</ul>" +
               $"<p>Ingresa a <a href=\"{_frontendBaseUrl}\">SIGRA</a> (módulo Frecuencias de radio) para iniciar la renovación y, cuando hayas actuado, marcar la alerta como atendida.</p>";
    }

    public Task<List<AlertaFrecuenciaDto>> ListarAlertasAsync(bool? atendida, int? idVendedor) =>
        _frecuenciaDA.ListarAlertasAsync(null, idVendedor, atendida);

    public async Task<AlertaFrecuenciaDto> AtenderAlertaAsync(int idAlerta, AtenderAlertaDto dto, int? idVendedor, int idUsuario)
    {
        var alerta = (await _frecuenciaDA.ListarAlertasAsync(idAlerta, idVendedor, null)).FirstOrDefault()
            ?? throw new ReglaNegocioException("La alerta indicada no existe.");

        if (alerta.Atendida)
            throw new ReglaNegocioException("La alerta ya fue marcada como atendida.");

        var nota = Normalizar(dto.Nota);
        if (nota is null)
            throw new ReglaNegocioException("Debe ingresar una nota describiendo las acciones tomadas");

        if (nota.Length > 1000)
            throw new ReglaNegocioException("La nota no puede superar los 1000 caracteres.");

        await _frecuenciaDA.AtenderAlertaAsync(idAlerta, nota, idUsuario);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "SolicitudFrecuencia", alerta.IdSolicitud, "ALERTA_VENCIMIENTO_ATENDIDA",
            $"SF-{alerta.IdSolicitud:0000}: alerta {DescripcionTipo(alerta.Tipo)} ({alerta.Empresa}, {alerta.Frecuencia}). Nota: {nota}");

        return (await _frecuenciaDA.ListarAlertasAsync(idAlerta, null, null)).First();
    }

    public Task<ResumenFrecuenciasDto> ObtenerResumenAsync() => _frecuenciaDA.ObtenerResumenAsync();

    public async Task<List<DocumentoSolicitudDto>> ListarDocumentosAsync(int idSolicitud, int? idVendedor)
    {
        await ObtenerSolicitudAsync(idSolicitud, idVendedor);
        return await _frecuenciaDA.ListarDocumentosAsync(idSolicitud);
    }

    public async Task<DocumentoSolicitudDto> AdjuntarDocumentoAsync(int idSolicitud, SubirDocumentoDto dto, int? idVendedor, int idUsuario)
    {
        var solicitud = await ObtenerSolicitudAsync(idSolicitud, idVendedor);
        var doc = ValidarDocumento(dto);

        var idDocumento = await _frecuenciaDA.InsertarDocumentoAsync(solicitud.IdSolicitud, doc.Tipo, doc.Nombre, doc.NombreArchivo,
            doc.TipoContenido, doc.Contenido, idUsuario);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "SolicitudFrecuencia", solicitud.IdSolicitud, "DOCUMENTO_SOLICITUD_ADJUNTADO",
            $"SF-{solicitud.IdSolicitud:0000}: {doc.Tipo} \"{doc.NombreArchivo}\" ({doc.Contenido.Length / 1024} KB)");

        return (await _frecuenciaDA.ListarDocumentosAsync(solicitud.IdSolicitud)).First(d => d.IdDocumento == idDocumento);
    }

    public async Task<DocumentoSolicitudArchivoDto> ObtenerDocumentoAsync(int idDocumento, int? idVendedor)
    {
        var documento = await _frecuenciaDA.ObtenerDocumentoAsync(idDocumento)
            ?? throw new ReglaNegocioException("El documento indicado no existe.");
        await ObtenerSolicitudAsync(documento.IdSolicitud, idVendedor);
        return documento;
    }

    private static string? Normalizar(string? valor) => string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();
}
