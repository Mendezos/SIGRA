using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Modelos;
using SIGRA.Abstracciones.Servicios;

namespace SIGRA.Flujo.Flujos;

public class AlquilerFlujo : IAlquilerFlujo
{
    private const string ModuloAuditoria = "Alquiler";
    private const int ModuloAlquiler = 3;
    private const string EntidadContactoInicial = "ContactoInicial";
    private const string TipoContactoSinVendedor = "ContactoSinVendedor";
    private const string EstadoPorVencer90 = "Por vencer (90 días)";
    private const string EstadoPorVencer30 = "Por vencer (30 días)";
    private const string MensajeEquipoNoDisponible = "El equipo seleccionado no se encuentra disponible en el inventario.";
    private const string MensajeEquipoDeCliente = "pertenece a un cliente y no se puede alquilar.";
    private const string CategoriaRepetidora = "Repetidora";
    private const long LimiteDocumentoBytes = 10 * 1024 * 1024;
    private static readonly string[] Monedas = { "CRC", "USD" };
    private const string ClasificacionAlquilada = "Alquilada por Radifax";
    private static readonly string[] Clasificaciones = { ClasificacionAlquilada, "Propia del cliente" };
    private static readonly string[] CategoriasRadio = { "Radio portátil", "Radio móvil" };
    private static readonly Regex PatronCorreo = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);
    private static readonly Regex PatronTelefono = new(@"^[0-9+\-\s()]{7,20}$", RegexOptions.Compiled);

    private readonly IAlquilerDA _alquilerDA;
    private readonly IInventarioDA _inventarioDA;
    private readonly IAuditoriaDA _auditoriaDA;
    private readonly IEmailService _emailService;
    private readonly IPlantillaContratoDA _plantillaDA;
    private readonly INotificacionesDA _notificacionesDA;
    private readonly ILogger<AlquilerFlujo> _logger;

    public AlquilerFlujo(IAlquilerDA alquilerDA, IInventarioDA inventarioDA, IAuditoriaDA auditoriaDA, IEmailService emailService,
        IPlantillaContratoDA plantillaDA, INotificacionesDA notificacionesDA, ILogger<AlquilerFlujo> logger)
    {
        _plantillaDA = plantillaDA;
        _alquilerDA = alquilerDA;
        _inventarioDA = inventarioDA;
        _auditoriaDA = auditoriaDA;
        _emailService = emailService;
        _notificacionesDA = notificacionesDA;
        _logger = logger;
    }

    // ---------- CARR-001: contacto inicial ----------
    public Task<List<VendedorDto>> ListarVendedoresAsync() => _alquilerDA.ListarVendedoresAsync();

    public async Task<SugerenciaContactoDto> ObtenerSugerenciaContactoAsync(string empresa)
    {
        if (string.IsNullOrWhiteSpace(empresa)) return new SugerenciaContactoDto();

        var nombre = empresa.Trim();
        return new SugerenciaContactoDto
        {
            VendedorPrevio = await _alquilerDA.ObtenerVendedorPrevioAsync(nombre),
            ContactoReciente = await _alquilerDA.ObtenerContactoRecienteAsync(nombre)
        };
    }

    public async Task<RegistrarContactoResultadoDto> RegistrarContactoAsync(RegistrarContactoDto dto, int idUsuario)
    {
        var empresa = Normalizar(dto.Empresa);
        var dato = Normalizar(dto.DatoContacto);

        if (empresa is null || dato is null)
            throw new ReglaNegocioException("Debe ingresar al menos el nombre de la empresa y un medio de contacto.");

        if (dto.MedioContacto is not ("Teléfono" or "Correo"))
            throw new ReglaNegocioException("El medio de contacto debe ser Teléfono o Correo.");

        if (dto.MedioContacto == "Correo" && !PatronCorreo.IsMatch(dato))
            throw new ReglaNegocioException("El correo del contacto no tiene un formato válido.");

        if (dto.MedioContacto == "Teléfono" && !PatronTelefono.IsMatch(dato))
            throw new ReglaNegocioException("El teléfono del contacto no tiene un formato válido.");

        if (empresa.Length > 150 || dato.Length > 150 || (dto.Contacto?.Length ?? 0) > 150 || (dto.Motivo?.Length ?? 0) > 500)
            throw new ReglaNegocioException("Alguno de los datos excede la longitud permitida.");

        if (!dto.ConfirmarDuplicado)
        {
            var reciente = await _alquilerDA.ObtenerContactoRecienteAsync(empresa);
            if (reciente is not null)
            {
                return new RegistrarContactoResultadoDto
                {
                    RequiereConfirmacion = true,
                    ContactoReciente = reciente,
                    Mensaje = $"Ya existe un contacto de {empresa} registrado en las últimas 24 horas. ¿Desea registrar uno nuevo de todas formas?"
                };
            }
        }

        int? idVendedor = null;
        string? motivoAsignacion = null;

        if (dto.IdVendedor is not null)
        {
            var activos = await _alquilerDA.ListarVendedoresAsync();
            if (!activos.Any(v => v.IdUsuario == dto.IdVendedor))
                throw new ReglaNegocioException("El vendedor indicado no está disponible.");

            idVendedor = dto.IdVendedor;
            motivoAsignacion = "Vendedor que atendió al cliente en contratos anteriores";
        }
        else
        {
            var siguiente = await _alquilerDA.ObtenerSiguienteVendedorCascadaAsync();
            if (siguiente is not null)
            {
                idVendedor = siguiente.IdUsuario;
                motivoAsignacion = "Asignación en cascada";
            }
        }

        var idContacto = await _alquilerDA.InsertarContactoAsync(empresa, Normalizar(dto.Contacto), dto.MedioContacto, dato,
            Normalizar(dto.Motivo), idVendedor, motivoAsignacion, idUsuario);

        var detalle = await ObtenerContactoAsync(idContacto);

        if (idVendedor is null)
        {
            await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "ContactoInicial", idContacto, "CONTACTO_SIN_VENDEDOR",
                $"{empresa}: no hay vendedores disponibles; queda en espera de asignación manual");

            // El contacto ya está guardado: un fallo al avisar no debe impedir ni revertir el registro.
            await AvisarAdministradoresContactoSinVendedorAsync(detalle.Contacto);
        }
        else
        {
            await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "ContactoInicial", idContacto, "CONTACTO_REGISTRADO",
                $"{empresa} asignado a {detalle.Contacto.Vendedor}");
        }

        return new RegistrarContactoResultadoDto
        {
            Contacto = detalle.Contacto,
            Mensaje = idVendedor is null
                ? "El contacto se registró sin vendedor porque no hay vendedores disponibles. Quedó en espera para que el administrador lo asigne."
                : $"El contacto se registró y se asignó a {detalle.Contacto.Vendedor}."
        };
    }

    // Aviso en la campana (y correo encolado) a cada administrador activo; la clave única evita duplicarlo si se repite.
    private async Task AvisarAdministradoresContactoSinVendedorAsync(ContactoDto contacto)
    {
        try
        {
            var administradores = await _alquilerDA.ListarAdministradoresAsync();
            var titulo = $"Contacto sin vendedor: {contacto.Empresa}";
            var mensaje = ArmarMensajeContactoSinVendedor(contacto);

            foreach (var administrador in administradores)
            {
                try
                {
                    await _notificacionesDA.RegistrarAsync(administrador.IdUsuario, ModuloAlquiler, titulo, mensaje,
                        EntidadContactoInicial, contacto.IdContacto, TipoContactoSinVendedor, $"CSV-{contacto.IdContacto}");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "No se pudo avisar al administrador {IdUsuario} del contacto sin vendedor {IdContacto}.",
                        administrador.IdUsuario, contacto.IdContacto);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "No se pudo avisar a los administradores del contacto sin vendedor {IdContacto}.", contacto.IdContacto);
        }
    }

    internal static string ArmarMensajeContactoSinVendedor(ContactoDto c)
    {
        var lineas = new List<string>
        {
            "Se registró un contacto inicial que quedó sin vendedor porque no hay vendedores disponibles.",
            $"Empresa: {c.Empresa}",
            $"Contacto: {(string.IsNullOrWhiteSpace(c.Contacto) ? "No indicado" : c.Contacto)}",
            $"Medio de contacto: {c.MedioContacto} ({c.DatoContacto})",
            $"Motivo: {(string.IsNullOrWhiteSpace(c.Motivo) ? "No indicado" : c.Motivo)}",
            $"Registrado por: {c.RegistradoPor}",
            "Asígnelo a un vendedor en Alquiler > Contactos iniciales."
        };
        return string.Join("\n", lineas);
    }

    public Task<List<ContactoDto>> ListarContactosAsync(int? idVendedor) => _alquilerDA.ListarContactosAsync(idVendedor);

    public async Task<DetalleContactoDto> ObtenerContactoAsync(int idContacto)
    {
        var contacto = (await _alquilerDA.ListarContactosAsync(null)).FirstOrDefault(c => c.IdContacto == idContacto)
            ?? throw new ReglaNegocioException("El contacto indicado no existe.");

        return new DetalleContactoDto
        {
            Contacto = contacto,
            Historial = await _alquilerDA.ObtenerHistorialContactoAsync(idContacto)
        };
    }

    public async Task<DetalleContactoDto> ReasignarContactoAsync(int idContacto, ReasignarContactoDto dto, int idUsuario)
    {
        if (!await _alquilerDA.ExisteContactoAsync(idContacto))
            throw new ReglaNegocioException("El contacto indicado no existe.");

        var motivo = Normalizar(dto.Motivo);
        if (dto.IdVendedor is null || motivo is null)
            throw new ValidacionException("Debe completar los campos obligatorios.", new List<string> { "Vendedor", "Motivo del cambio" });

        if (motivo.Length > 300)
            throw new ReglaNegocioException("El motivo no puede superar los 300 caracteres.");

        var activos = await _alquilerDA.ListarVendedoresAsync();
        var vendedor = activos.FirstOrDefault(v => v.IdUsuario == dto.IdVendedor)
            ?? throw new ReglaNegocioException("Solo se puede reasignar a un vendedor disponible.");

        await _alquilerDA.ReasignarContactoAsync(idContacto, vendedor.IdUsuario, idUsuario, motivo);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "ContactoInicial", idContacto, "CONTACTO_REASIGNADO",
            $"Asignado a {vendedor.Nombre}. {motivo}");

        return await ObtenerContactoAsync(idContacto);
    }

    // ---------- CARR-002 / CARR-014: contratos ----------
    public Task<List<ClienteDto>> ListarClientesAsync() => _alquilerDA.ListarClientesAsync();

    public Task<List<EquipoDisponibleDto>> ListarEquiposParaContratoAsync() => _alquilerDA.ListarEquiposParaContratoAsync();

    // Valida todo lo que pide GCFS-005/007 y devuelve los datos listos para guardar el borrador.
    private async Task<(DatosContratoModel Datos, List<int> IdsEquipo, List<string> Series, List<AccesorioContratoItemDto> Accesorios)> PrepararBorradorAsync(
        RegistrarContratoDto dto, int? idVendedor, int? plantillaActual = null)
    {
        var empresa = Normalizar(dto.Empresa);
        var contacto = Normalizar(dto.Contacto);
        var telefono = Normalizar(dto.Telefono);
        var correo = Normalizar(dto.Correo);
        var direccion = Normalizar(dto.Direccion);
        var moneda = Normalizar(dto.Moneda)?.ToUpperInvariant();
        var seriesIngresadas = (dto.Series ?? new List<string>()).Select(s => s?.Trim() ?? string.Empty).Where(s => s.Length > 0).ToList();

        var faltantes = new List<string>();
        if (empresa is null) faltantes.Add("Empresa cliente");
        if (contacto is null) faltantes.Add("Contacto");
        if (direccion is null) faltantes.Add("Dirección física");
        if (telefono is null) faltantes.Add("Teléfono");
        if (correo is null) faltantes.Add("Correo");
        if (dto.IdPlantilla is null) faltantes.Add("Plantilla de contrato");
        if (seriesIngresadas.Count == 0) faltantes.Add("Equipo (número de serie)");
        if (dto.FechaInicio is null) faltantes.Add("Fecha de inicio");
        if (dto.FechaVencimiento is null) faltantes.Add("Fecha de vencimiento");
        if (dto.MontoMensual is null) faltantes.Add("Precio mensual");
        if (moneda is null) faltantes.Add("Moneda");
        if (idVendedor is null) faltantes.Add("Responsable");
        if (faltantes.Count > 0)
            throw new ValidacionException("Debe completar los campos obligatorios para registrar el contrato.", faltantes);

        if (empresa!.Length > 150)
            throw new ReglaNegocioException("El nombre de la empresa no puede superar los 150 caracteres.");
        if (contacto!.Length > 150 || direccion!.Length > 300)
            throw new ReglaNegocioException("El contacto admite hasta 150 caracteres y la dirección hasta 300.");
        if (!PatronCorreo.IsMatch(correo!) || correo!.Length > 150)
            throw new ReglaNegocioException("El correo del cliente no tiene un formato válido.");
        if (!PatronTelefono.IsMatch(telefono!))
            throw new ReglaNegocioException("El teléfono del cliente no tiene un formato válido.");

        if (!Monedas.Contains(moneda!))
            throw new ReglaNegocioException("El tipo de moneda no está permitido. Seleccione colones (CRC) o dólares (USD).");

        if (dto.FechaVencimiento!.Value.Date <= dto.FechaInicio!.Value.Date)
            throw new ReglaNegocioException("La fecha de vencimiento debe ser posterior a la fecha de inicio del contrato.");

        if (dto.MontoMensual <= 0)
            throw new ReglaNegocioException("El precio mensual debe ser un valor numérico mayor a cero.");

        var repetida = seriesIngresadas.GroupBy(s => s, StringComparer.OrdinalIgnoreCase).FirstOrDefault(g => g.Count() > 1);
        if (repetida is not null)
            throw new ReglaNegocioException($"El equipo {repetida.Key} aparece más de una vez en el contrato.");

        var plantilla = await _plantillaDA.ObtenerAsync(dto.IdPlantilla!.Value, null)
            ?? throw new ReglaNegocioException("La plantilla de contrato seleccionada no existe.");
        if (!plantilla.Activa && plantillaActual != plantilla.Id)
            throw new ReglaNegocioException("La plantilla seleccionada está inactiva. Elija una plantilla activa.");

        var idsEquipo = new List<int>();
        foreach (var serie in seriesIngresadas)
        {
            var equipo = await _inventarioDA.ObtenerEquipoAsync(null, serie)
                ?? throw new ReglaNegocioException($"El número de serie ingresado no existe en el inventario ({serie}).");

            if (equipo.Estado != "Disponible")
                throw new ReglaNegocioException($"{MensajeEquipoNoDisponible.TrimEnd('.')} ({serie}: {equipo.Estado}).");

            if (equipo.Propietario == "Cliente")
                throw new ReglaNegocioException($"El equipo {serie} {MensajeEquipoDeCliente}");

            if (equipo.ManejaCantidad)
                throw new ReglaNegocioException($"El equipo {serie} se maneja por cantidad; los accesorios se asocian al contrato por separado.");

            idsEquipo.Add(equipo.IdEquipo);
        }

        var accesorios = await ValidarAccesoriosAsync(dto.Accesorios);

        var datos = new DatosContratoModel
        {
            Empresa = empresa,
            Contacto = contacto,
            Telefono = telefono,
            Correo = correo,
            Direccion = direccion,
            IdPlantilla = plantilla.Id,
            VersionPlantilla = plantilla.VersionActual,
            FechaInicio = dto.FechaInicio.Value.Date,
            FechaVencimiento = dto.FechaVencimiento.Value.Date,
            FechaFirma = dto.FechaFirma?.Date,
            MontoMensual = dto.MontoMensual.Value,
            Moneda = moneda!,
            Condiciones = Normalizar(dto.Condiciones),
            ClausulasAdicionales = Normalizar(dto.ClausulasAdicionales),
            Responsabilidades = Normalizar(dto.Responsabilidades),
            Penalizacion = Normalizar(dto.Penalizacion),
            IdVendedor = idVendedor,
            CubreReparaciones = dto.CubreReparaciones
        };
        return (datos, idsEquipo, seriesIngresadas, accesorios);
    }

    // GCFS-005: el contrato nace en Borrador; los equipos no se asignan hasta activarlo con el documento firmado.
    public async Task<DetalleContratoDto> RegistrarContratoAsync(RegistrarContratoDto dto, int? idVendedor, int idUsuario)
    {
        var (datos, idsEquipo, _, accesorios) = await PrepararBorradorAsync(dto, idVendedor ?? dto.IdVendedor);

        var idContrato = await _alquilerDA.InsertarContratoAsync(datos, idsEquipo, accesorios, idUsuario);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Contrato", idContrato, "CONTRATO_REGISTRADO",
            $"Borrador de {datos.Empresa}: {idsEquipo.Count} equipo(s), {datos.FechaInicio:yyyy-MM-dd} a {datos.FechaVencimiento:yyyy-MM-dd}");

        return await ObtenerContratoAsync(idContrato);
    }

    // GCFS-007: solo se editan contratos en borrador; se guardan los valores anteriores y los nuevos.
    public async Task<DetalleContratoDto> EditarContratoAsync(int idContrato, RegistrarContratoDto dto, int idUsuario, bool esAdministrador)
    {
        var actual = await ObtenerContratoAsync(idContrato);
        var contrato = actual.Contrato;

        if (!esAdministrador && contrato.IdVendedor != idUsuario)
            throw new ReglaNegocioException("Solo puede editar los contratos que usted registró.");

        if (contrato.EstadoRegistrado != "Borrador")
            throw new ReglaNegocioException(
                $"El contrato está {contrato.EstadoRegistrado.ToLowerInvariant()} y no se puede editar directamente. " +
                (contrato.EstadoRegistrado is "Activo" or "Renovado" ? "Para cambiar sus condiciones use la renovación." : "Registre un contrato nuevo si hace falta."));

        var responsable = esAdministrador ? (dto.IdVendedor ?? contrato.IdVendedor) : contrato.IdVendedor;
        var (datos, idsEquipo, series, accesorios) = await PrepararBorradorAsync(dto, responsable, contrato.IdPlantilla);

        await _alquilerDA.EditarContratoBorradorAsync(idContrato, datos, idsEquipo, accesorios);

        var cambios = new List<string>();
        void Comparar(string campo, object? antes, object? despues)
        {
            var a = antes?.ToString() ?? "(vacío)";
            var d = despues?.ToString() ?? "(vacío)";
            if (a != d) cambios.Add($"{campo}: {a} -> {d}");
        }
        Comparar("Empresa", contrato.Empresa, datos.Empresa);
        Comparar("Contacto", contrato.Contacto, datos.Contacto);
        Comparar("Teléfono", contrato.Telefono, datos.Telefono);
        Comparar("Correo", contrato.Correo, datos.Correo);
        Comparar("Dirección", contrato.Direccion, datos.Direccion);
        Comparar("Plantilla", contrato.IdPlantilla is null ? null : $"PL-{contrato.IdPlantilla:000} v{contrato.VersionPlantilla}", $"PL-{datos.IdPlantilla:000} v{datos.VersionPlantilla}");
        Comparar("Inicio", contrato.FechaInicio.ToString("yyyy-MM-dd"), datos.FechaInicio.ToString("yyyy-MM-dd"));
        Comparar("Vencimiento", contrato.FechaVencimiento.ToString("yyyy-MM-dd"), datos.FechaVencimiento.ToString("yyyy-MM-dd"));
        Comparar("Fecha de firma", contrato.FechaFirma?.ToString("yyyy-MM-dd"), datos.FechaFirma?.ToString("yyyy-MM-dd"));
        Comparar("Precio mensual", contrato.MontoMensual.ToString("0.##"), datos.MontoMensual.ToString("0.##"));
        Comparar("Moneda", contrato.Moneda, datos.Moneda);
        Comparar("Cláusulas adicionales", contrato.ClausulasAdicionales, datos.ClausulasAdicionales);
        Comparar("Responsabilidades", contrato.Responsabilidades, datos.Responsabilidades);
        Comparar("Penalización", contrato.Penalizacion, datos.Penalizacion);
        Comparar("Condiciones", contrato.Condiciones, datos.Condiciones);
        Comparar("Cobertura de reparaciones", contrato.CubreReparaciones, datos.CubreReparaciones);
        Comparar("Responsable", contrato.IdVendedor, datos.IdVendedor);
        Comparar("Equipos", string.Join(", ", actual.Equipos.Select(e => e.NumeroSerie).OrderBy(s => s)), string.Join(", ", series.OrderBy(s => s)));

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Contrato", idContrato, "CONTRATO_EDITADO",
            cambios.Count == 0 ? "Se guardó el borrador sin cambios en los datos" : string.Join("; ", cambios));

        return await ObtenerContratoAsync(idContrato);
    }

    // GCFS-008: activar con el documento firmado. El documento es un PDF de hasta 10 MB.
    public async Task<DetalleContratoDto> ActivarContratoAsync(int idContrato, DateTime? fechaFirma, DateTime? fechaInicioReal,
        string? nombreArchivo, byte[]? contenido, int idUsuario, bool esAdministrador)
    {
        var detalle = await ObtenerContratoAsync(idContrato);
        var contrato = detalle.Contrato;

        if (!esAdministrador && contrato.IdVendedor != idUsuario)
            throw new ReglaNegocioException("Solo puede activar los contratos que usted registró.");

        if (contrato.EstadoRegistrado != "Borrador")
            throw new ReglaNegocioException($"El contrato ya está {contrato.EstadoRegistrado.ToLowerInvariant()}: solo se activan contratos en borrador.");

        if (contenido is null || contenido.Length == 0)
            throw new ReglaNegocioException("Adjunte el documento firmado (PDF) para activar el contrato. Mientras tanto sigue en borrador.");

        var nombre = Path.GetFileName(nombreArchivo?.Trim() ?? string.Empty);
        if (!nombre.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) || !EsPdf(contenido))
            throw new ReglaNegocioException("El archivo no es válido: solo se aceptan documentos PDF de hasta 10 MB.");
        if (contenido.Length > LimiteDocumentoBytes)
            throw new ReglaNegocioException("El archivo es demasiado grande: el tamaño máximo es de 10 MB.");
        if (nombre.Length > 200)
            throw new ReglaNegocioException("El nombre del archivo no puede superar los 200 caracteres.");

        if (fechaFirma is null)
            throw new ValidacionException("Debe completar los campos obligatorios.", new List<string> { "Fecha de firma" });
        if (fechaFirma.Value.Date > DateTime.Today)
            throw new ReglaNegocioException("La fecha de firma no puede ser posterior a hoy.");

        if (contrato.FechaInicio.Date < DateTime.Today && fechaInicioReal is null)
            throw new ReglaNegocioException("La fecha de inicio del contrato ya pasó. Confirme la fecha real de vigencia antes de activarlo.");
        if (fechaInicioReal is not null && fechaInicioReal.Value.Date >= contrato.FechaVencimiento.Date)
            throw new ReglaNegocioException("La fecha real de inicio debe ser anterior a la fecha de vencimiento.");

        await _alquilerDA.ActivarContratoAsync(idContrato, fechaFirma.Value.Date, fechaInicioReal?.Date, nombre, contenido, idUsuario);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Contrato", idContrato, "CONTRATO_ACTIVADO",
            $"Documento firmado {nombre}, firma {fechaFirma:yyyy-MM-dd}; equipos asignados: {string.Join(", ", detalle.Equipos.Select(e => e.NumeroSerie))}"
            + (contrato.IdContratoOrigen is null ? "" : $". Renueva el contrato CT-{contrato.IdContratoOrigen:0000}"));

        if (contrato.IdContratoOrigen is not null)
            await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Contrato", contrato.IdContratoOrigen.Value, "CONTRATO_RENOVADO",
                $"Renovado por el contrato CT-{idContrato:0000}, vigente desde {(fechaInicioReal ?? contrato.FechaInicio):yyyy-MM-dd}");

        return await ObtenerContratoAsync(idContrato);
    }

    private static bool EsPdf(byte[] contenido) =>
        contenido.Length > 4 && contenido[0] == 0x25 && contenido[1] == 0x50 && contenido[2] == 0x44 && contenido[3] == 0x46;

    public async Task<ArchivoContratoDto> ObtenerDocumentoContratoAsync(int idContrato, int idDocumento) =>
        await _alquilerDA.ObtenerDocumentoDeContratoAsync(idContrato, idDocumento)
            ?? throw new ReglaNegocioException("El documento indicado no existe.");

    public Task<List<ContratoDto>> ListarContratosAsync(FiltroContratosDto filtro)
    {
        var estadosValidos = new[] { "Borrador", "Activo", EstadoPorVencer90, EstadoPorVencer30, "Vencido", "Renovado", "Cancelado" };
        filtro.Texto = Normalizar(filtro.Texto);
        filtro.Estado = Normalizar(filtro.Estado);
        filtro.Moneda = Normalizar(filtro.Moneda)?.ToUpperInvariant();
        if (filtro.Estado is not null && !estadosValidos.Contains(filtro.Estado))
            throw new ReglaNegocioException("El estado indicado no es válido.");
        if (filtro.Moneda is not null && !Monedas.Contains(filtro.Moneda))
            throw new ReglaNegocioException("La moneda indicada no es válida.");
        if (filtro.VenceDesde is not null && filtro.VenceHasta is not null && filtro.VenceDesde > filtro.VenceHasta)
            throw new ReglaNegocioException("El rango de vencimiento no es válido: la fecha inicial es posterior a la final.");

        return _alquilerDA.ListarContratosAsync(filtro);
    }

    public async Task<DetalleContratoDto> ObtenerContratoAsync(int idContrato)
    {
        var contrato = await _alquilerDA.ObtenerContratoAsync(idContrato)
            ?? throw new ReglaNegocioException("El contrato indicado no existe.");

        var equipos = await _alquilerDA.ListarEquiposDeContratoAsync(idContrato);
        contrato.CantidadEquipos = equipos.Count;
        contrato.Series = string.Join(", ", equipos.Select(e => e.NumeroSerie));

        var accesoriosContrato = await _alquilerDA.ListarAccesoriosDeContratoAsync(idContrato);
        var documentos = await _alquilerDA.ListarDocumentosDeContratoAsync(idContrato);

        return new DetalleContratoDto { Contrato = contrato, Equipos = equipos, Accesorios = accesoriosContrato, Documentos = documentos };
    }

    // ---------- CARR-006: fichas de radios ----------
    public async Task<DetalleContratoDto> AgregarRadioAContratoAsync(AgregarRadioDto dto, int idUsuario)
    {
        var serie = Normalizar(dto.NumeroSerie);
        var faltantes = new List<string>();
        if (dto.IdContrato is null) faltantes.Add("Contrato");
        if (serie is null) faltantes.Add("Número de serie");
        if (dto.FechaAsignacion is null) faltantes.Add("Fecha de asignación");
        if (faltantes.Count > 0)
            throw new ValidacionException("Debe completar los campos obligatorios.", faltantes);

        var contrato = await _alquilerDA.ObtenerContratoAsync(dto.IdContrato!.Value)
            ?? throw new ReglaNegocioException("El contrato indicado no existe.");

        if (contrato.EstadoRegistrado is not ("Activo" or "Renovado"))
            throw new ReglaNegocioException("Solo se pueden asignar radios a un contrato vigente.");

        var equipo = await _inventarioDA.ObtenerEquipoAsync(null, serie)
            ?? throw new ReglaNegocioException("El número de serie ingresado no existe en el inventario.");

        if (!CategoriasRadio.Contains(equipo.Categoria))
            throw new ReglaNegocioException("El número de serie ingresado no corresponde a un radio.");

        if (await _alquilerDA.TieneContratoActivoAsync(equipo.IdEquipo))
            throw new ReglaNegocioException("El número de serie ya se encuentra registrado.");

        if (equipo.Estado != "Disponible")
            throw new ReglaNegocioException($"{MensajeEquipoNoDisponible.TrimEnd('.')} (estado actual: {equipo.Estado}).");

        if (equipo.Propietario == "Cliente")
            throw new ReglaNegocioException($"El equipo {serie} {MensajeEquipoDeCliente}");

        var fecha = dto.FechaAsignacion!.Value.Date;
        if (fecha < contrato.FechaInicio.Date || fecha > contrato.FechaVencimiento.Date)
            throw new ReglaNegocioException("La fecha de asignación debe estar dentro de la vigencia del contrato.");

        await _alquilerDA.AgregarEquipoAContratoAsync(contrato.IdContrato, equipo.IdEquipo, fecha, idUsuario);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Contrato", contrato.IdContrato, "RADIO_ASIGNADO",
            $"{equipo.NumeroSerie} ({equipo.Marca} {equipo.Modelo}) asignado a {contrato.Empresa}");

        return await ObtenerContratoAsync(contrato.IdContrato);
    }

    public Task<List<RadioDto>> ListarRadiosAsync(string? texto) => _alquilerDA.ListarRadiosAsync(Normalizar(texto), null);

    public async Task<RadioDto> ObtenerRadioPorSerieAsync(string numeroSerie)
    {
        var radio = string.IsNullOrWhiteSpace(numeroSerie)
            ? null
            : (await _alquilerDA.ListarRadiosAsync(null, numeroSerie.Trim())).FirstOrDefault();

        return radio ?? throw new ReglaNegocioException("No se encontró ningún radio en alquiler con ese número de serie.");
    }

    // ---------- INVE-009: accesorios entregados ----------
    private async Task<List<AccesorioContratoItemDto>> ValidarAccesoriosAsync(List<AccesorioContratoItemDto>? items)
    {
        var lista = items ?? new List<AccesorioContratoItemDto>();
        if (lista.Count == 0) return lista;

        if (lista.GroupBy(i => i.IdAccesorioModelo).Any(g => g.Count() > 1))
            throw new ReglaNegocioException("Un accesorio solo puede aparecer una vez en la lista; sume las cantidades.");

        if (lista.Any(i => i.Cantidad < 1))
            throw new ReglaNegocioException("La cantidad de cada accesorio debe ser un número entero mayor a cero.");

        var catalogo = (await _inventarioDA.ListarArticulosAsync("accesorio")).Select(a => a.Id).ToHashSet();
        if (lista.Any(i => !catalogo.Contains(i.IdAccesorioModelo)))
            throw new ReglaNegocioException("Alguno de los accesorios seleccionados no existe en el catálogo.");

        return lista;
    }

    public async Task<DetalleContratoDto> GuardarAccesoriosContratoAsync(int idContrato, GuardarAccesoriosContratoDto dto, int idUsuario, bool esAdministrador)
    {
        var contrato = await _alquilerDA.ObtenerContratoAsync(idContrato)
            ?? throw new ReglaNegocioException("El contrato indicado no existe.");

        if (!esAdministrador && contrato.IdVendedor != idUsuario)
            throw new ReglaNegocioException("Solo puede editar los accesorios de los contratos que usted registró.");

        if (contrato.EstadoRegistrado is not ("Activo" or "Renovado"))
            throw new ReglaNegocioException("Solo se pueden editar los accesorios de un contrato vigente.");

        var accesorios = await ValidarAccesoriosAsync(dto.Accesorios);
        await _alquilerDA.GuardarAccesoriosDeContratoAsync(idContrato, accesorios);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Contrato", idContrato, "ACCESORIOS_ACTUALIZADOS",
            accesorios.Count == 0 ? "Se quitaron todos los accesorios entregados" : $"{accesorios.Count} accesorio(s), {accesorios.Sum(a => a.Cantidad)} unidad(es) en total");

        return await ObtenerContratoAsync(idContrato);
    }

    // ---------- CARR-003 / GCFS-009: renovar ----------
    // La renovación crea un contrato nuevo en borrador vinculado al actual. Cuando se activa con el documento firmado,
    // el contrato anterior pasa a Renovado y sus equipos se traspasan al nuevo.
    public async Task<DetalleContratoDto> RenovarContratoAsync(int idContrato, RenovarContratoDto dto, int idUsuario, bool esAdministrador)
    {
        var detalle = await ObtenerContratoAsync(idContrato);
        var contrato = detalle.Contrato;

        if (!esAdministrador && contrato.IdVendedor != idUsuario)
            throw new ReglaNegocioException("Solo puede renovar los contratos que usted registró.");

        if (contrato.Estado == "Cancelado")
            throw new ReglaNegocioException("No es posible renovar un contrato cancelado.");

        if (contrato.EstadoRegistrado == "Borrador")
            throw new ReglaNegocioException("El contrato todavía está en borrador. Actívelo con el documento firmado antes de renovarlo.");

        if (contrato.IdContratoSucesor is not null)
            throw new ReglaNegocioException($"El contrato ya fue renovado por CT-{contrato.IdContratoSucesor:0000}.");

        if (contrato.Estado is not (EstadoPorVencer90 or EstadoPorVencer30 or "Vencido"))
            throw new ReglaNegocioException("El contrato aún no se encuentra en periodo de renovación.");

        if (dto.NuevaFechaVencimiento is null)
            throw new ValidacionException("Debe completar los campos obligatorios.", new List<string> { "Nueva fecha de vencimiento" });

        // La renovación debe empezar después de que termine el contrato vigente (por defecto, al día siguiente).
        var nuevoInicio = (dto.NuevaFechaInicio ?? contrato.FechaVencimiento.AddDays(1)).Date;
        if (nuevoInicio <= contrato.FechaVencimiento.Date)
            throw new ReglaNegocioException($"Las fechas se superponen con el contrato vigente: la renovación debe comenzar después del {contrato.FechaVencimiento:dd/MM/yyyy}.");

        if (dto.NuevaFechaVencimiento.Value.Date <= nuevoInicio)
            throw new ReglaNegocioException("La nueva fecha de vencimiento debe ser posterior a la fecha de inicio de la renovación.");

        if (dto.NuevoMonto is <= 0)
            throw new ReglaNegocioException("El precio mensual debe ser un valor numérico mayor a cero.");

        var vigentes = detalle.Equipos.ToDictionary(e => e.IdEquipo);
        var retirar = (dto.IdsRetirar ?? new List<int>()).Distinct().ToList();
        foreach (var id in retirar)
        {
            if (!vigentes.ContainsKey(id))
                throw new ReglaNegocioException("El equipo que desea retirar no forma parte del contrato.");
        }

        var agregar = new List<EquipoDetalleDto>();
        foreach (var serie in (dto.SeriesAgregar ?? new List<string>()).Select(s => s?.Trim() ?? string.Empty).Where(s => s.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var equipo = await _inventarioDA.ObtenerEquipoAsync(null, serie)
                ?? throw new ReglaNegocioException($"El número de serie ingresado no existe en el inventario ({serie}).");

            if (equipo.Estado != "Disponible")
                throw new ReglaNegocioException($"{MensajeEquipoNoDisponible.TrimEnd('.')} ({serie}: {equipo.Estado}).");

            if (equipo.Propietario == "Cliente")
                throw new ReglaNegocioException($"El equipo {serie} {MensajeEquipoDeCliente}");

            if (equipo.ManejaCantidad)
                throw new ReglaNegocioException($"El equipo {serie} se maneja por cantidad; los accesorios se asocian al contrato por separado.");

            agregar.Add(equipo);
        }

        var idsEquipo = vigentes.Keys.Where(id => !retirar.Contains(id)).Concat(agregar.Select(e => e.IdEquipo)).ToList();
        if (idsEquipo.Count == 0)
            throw new ReglaNegocioException("El contrato debe conservar al menos un equipo. Si el cliente ya no continúa, cancele el contrato.");

        var observacion = Normalizar(dto.Observacion);
        if ((agregar.Count > 0 || retirar.Count > 0) && observacion is null)
            throw new ReglaNegocioException("Indique el motivo del cambio de equipos de la renovación.");

        var datos = new DatosContratoModel
        {
            Empresa = contrato.Empresa,
            Contacto = contrato.Contacto,
            Telefono = contrato.Telefono,
            Correo = contrato.Correo,
            Direccion = contrato.Direccion,
            IdPlantilla = contrato.IdPlantilla,
            VersionPlantilla = contrato.VersionPlantilla,
            FechaInicio = nuevoInicio,
            FechaVencimiento = dto.NuevaFechaVencimiento.Value.Date,
            MontoMensual = dto.NuevoMonto ?? contrato.MontoMensual,
            Moneda = contrato.Moneda,
            Condiciones = observacion is null ? contrato.Condiciones : $"{contrato.Condiciones}\nRenovación: {observacion}".Trim(),
            ClausulasAdicionales = contrato.ClausulasAdicionales,
            Responsabilidades = contrato.Responsabilidades,
            Penalizacion = contrato.Penalizacion,
            IdVendedor = contrato.IdVendedor,
            CubreReparaciones = contrato.CubreReparaciones,
            IdContratoOrigen = idContrato
        };
        var accesorios = detalle.Accesorios.Select(a => new AccesorioContratoItemDto { IdAccesorioModelo = a.IdAccesorioModelo, Cantidad = a.Cantidad }).ToList();

        var idNuevo = await _alquilerDA.InsertarContratoAsync(datos, idsEquipo, accesorios, idUsuario);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Contrato", idContrato, "RENOVACION_REGISTRADA",
            $"Borrador de renovación CT-{idNuevo:0000}: {nuevoInicio:yyyy-MM-dd} a {dto.NuevaFechaVencimiento:yyyy-MM-dd}"
            + (dto.NuevoMonto is null ? "" : $"; precio mensual {contrato.MontoMensual:0.##} -> {dto.NuevoMonto:0.##}")
            + (observacion is null ? "" : $". {observacion}"));
        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Contrato", idNuevo, "CONTRATO_REGISTRADO",
            $"Borrador que renueva el contrato CT-{idContrato:0000}");
        foreach (var equipo in agregar)
            await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Contrato", idNuevo, "EQUIPO_AGREGADO", equipo.NumeroSerie);
        foreach (var id in retirar)
            await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Contrato", idNuevo, "EQUIPO_RETIRADO", vigentes[id].NumeroSerie);

        return await ObtenerContratoAsync(idNuevo);
    }

    public async Task<List<RenovacionDto>> ListarRenovacionesAsync(int idContrato, int idUsuario, bool esAdministrador)
    {
        var contrato = await _alquilerDA.ObtenerContratoAsync(idContrato)
            ?? throw new ReglaNegocioException("El contrato indicado no existe.");

        if (!esAdministrador && contrato.IdVendedor != idUsuario)
            throw new ReglaNegocioException("Solo puede consultar el historial de renovaciones de sus propios contratos.");

        return await _alquilerDA.ListarRenovacionesAsync(idContrato);
    }

    // ---------- CARR-004 / GCFS-010: cancelar ----------
    public async Task<DetalleContratoDto> CancelarContratoAsync(int idContrato, CancelarContratoDto dto, int idUsuario, bool esAdministrador)
    {
        var detalle = await ObtenerContratoAsync(idContrato);
        var contrato = detalle.Contrato;

        if (!esAdministrador && contrato.IdVendedor != idUsuario)
            throw new ReglaNegocioException("Solo puede cancelar los contratos que usted registró.");

        if (contrato.EstadoRegistrado is "Borrador" or "Vencido" or "Cancelado" or "Renovado" || contrato.Estado == "Vencido")
            throw new ReglaNegocioException($"El contrato no puede cancelarse porque su estado actual es {contrato.Estado.ToLowerInvariant()}.");

        var motivo = Normalizar(dto.Motivo)
            ?? throw new ReglaNegocioException("Debe indicar el motivo de la cancelación.");
        if (motivo.Length > 300)
            throw new ReglaNegocioException("El motivo no puede superar los 300 caracteres.");

        var fecha = (dto.FechaCancelacion ?? DateTime.Today).Date;
        if (fecha < contrato.FechaInicio.Date)
            throw new ReglaNegocioException($"La fecha de cancelación no puede ser anterior al inicio del contrato ({contrato.FechaInicio:dd/MM/yyyy}).");
        if (fecha > contrato.FechaVencimiento.Date)
            throw new ReglaNegocioException($"La fecha de cancelación no puede ser posterior al vencimiento del contrato ({contrato.FechaVencimiento:dd/MM/yyyy}).");

        var moneda = Normalizar(dto.PenalizacionMoneda)?.ToUpperInvariant() ?? contrato.Moneda;
        if (!Monedas.Contains(moneda))
            throw new ReglaNegocioException("El tipo de moneda de la penalización no está permitido.");
        if (dto.PenalizacionMonto is < 0)
            throw new ReglaNegocioException("El monto de la penalización no puede ser negativo.");

        var justificacion = Normalizar(dto.PenalizacionJustificacion);
        var observaciones = Normalizar(dto.Observaciones);
        if (justificacion?.Length > 300 || observaciones?.Length > 500)
            throw new ReglaNegocioException("La justificación admite hasta 300 caracteres y las observaciones hasta 500.");

        // Si las condiciones del contrato prevén una penalización, hay que cobrarla o explicar por qué no se cobra.
        if (!string.IsNullOrWhiteSpace(contrato.Penalizacion) && (dto.PenalizacionMonto is null or 0) && justificacion is null)
            throw new ReglaNegocioException("El contrato tiene una condición de penalización: registre el monto o justifique por qué no se cobra.");

        dto.Motivo = motivo;
        dto.FechaCancelacion = fecha;
        dto.PenalizacionMoneda = moneda;
        dto.PenalizacionJustificacion = justificacion;
        dto.Observaciones = observaciones;

        await _alquilerDA.CancelarContratoAsync(idContrato, dto, idUsuario);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Contrato", idContrato, "CONTRATO_CANCELADO",
            $"{motivo}. Fecha {fecha:yyyy-MM-dd}"
            + (dto.PenalizacionMonto is > 0 ? $"; penalización {moneda} {dto.PenalizacionMonto:0.##}" : justificacion is null ? "" : $"; sin penalización: {justificacion}")
            + $". Equipos liberados: {string.Join(", ", detalle.Equipos.Select(e => e.NumeroSerie))}");

        return await ObtenerContratoAsync(idContrato);
    }

    // ---------- CARR-015: auditoría ----------
    public async Task<List<AuditoriaContratoDto>> ListarAuditoriaContratoAsync(int idContrato)
    {
        if (await _alquilerDA.ObtenerContratoAsync(idContrato) is null)
            throw new ReglaNegocioException("El contrato indicado no existe.");

        return await _alquilerDA.ListarAuditoriaContratoAsync(idContrato);
    }

    // ---------- CARR-005: vencimientos y alertas ----------
    public async Task<ResultadoProcesoVencimientosDto> ProcesarVencimientosAsync()
    {
        var resultado = new ResultadoProcesoVencimientosDto
        {
            ContratosVencidos = await _alquilerDA.MarcarContratosVencidosAsync()
        };

        var pendientes = await _alquilerDA.ListarAlertasPendientesAsync();
        if (pendientes.Count == 0) return resultado;

        var administradores = await _alquilerDA.ListarAdministradoresAsync();

        foreach (var alerta in pendientes)
        {
            var codigo = $"CT-{alerta.IdContrato:0000}";
            var (asunto, mensaje) = ArmarAlerta(alerta, codigo);

            // Aviso en la campana del vendedor responsable y de los administradores (el correo sale por su canal actual).
            await AvisarAlertaContratoEnCampanaAsync(alerta, codigo, administradores);

            var destinatarios = new List<(string Correo, string Nombre)>();
            if (alerta.Tipo != "3 anios" && !string.IsNullOrWhiteSpace(alerta.CorreoCliente))
                destinatarios.Add((alerta.CorreoCliente!, alerta.Contacto ?? alerta.Empresa));
            destinatarios.AddRange(administradores.Select(a => (a.Correo, a.Nombre)));

            var enviados = 0;
            foreach (var destino in destinatarios)
            {
                try
                {
                    await _emailService.EnviarAsync(destino.Correo, destino.Nombre, asunto, mensaje);
                    enviados++;
                }
                catch (Exception ex)
                {
                    resultado.Errores.Add($"{codigo} ({alerta.Tipo}) a {destino.Correo}: {ex.Message}");
                }
            }

            // Si ningún correo salió, la alerta se reintenta en la próxima ejecución.
            if (destinatarios.Count > 0 && enviados == 0) continue;

            await _alquilerDA.RegistrarAlertaAsync(alerta.IdContrato, alerta.Tipo);
            await _auditoriaDA.RegistrarAsync(null, ModuloAuditoria, "Contrato", alerta.IdContrato, "CONTRATO_ALERTA",
                $"{asunto} ({enviados} correo(s) enviado(s))");
            resultado.AlertasGeneradas++;
        }

        return resultado;
    }

    // Es idempotente (clave única por contrato, tipo de alerta y usuario) y nunca interrumpe el proceso de vencimientos.
    private async Task AvisarAlertaContratoEnCampanaAsync(AlertaContratoDto alerta, string codigo, IEnumerable<AdministradorDto> administradores)
    {
        var destinatarios = administradores.Select(a => a.IdUsuario).ToList();
        if (alerta.IdVendedor is int idVendedor && !destinatarios.Contains(idVendedor))
            destinatarios.Add(idVendedor);

        var (titulo, mensaje) = ArmarAvisoContrato(alerta, codigo);
        var tipoClave = alerta.Tipo.Replace(" ", string.Empty);

        foreach (var idUsuario in destinatarios)
        {
            try
            {
                await _notificacionesDA.RegistrarAsync(idUsuario, ModuloAlquiler, titulo, mensaje, "Contrato", alerta.IdContrato,
                    "Contrato", $"CTA-{alerta.IdContrato}-{tipoClave}-{idUsuario}", enviarCorreo: false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "No se pudo registrar en la campana el aviso del contrato {Codigo} ({Tipo}) para el usuario {IdUsuario}.",
                    codigo, alerta.Tipo, idUsuario);
            }
        }
    }

    internal static (string Titulo, string Mensaje) ArmarAvisoContrato(AlertaContratoDto alerta, string codigo)
    {
        var vence = alerta.FechaVencimiento.ToString("dd/MM/yyyy");
        return alerta.Tipo switch
        {
            "3 anios" => ($"Contrato {codigo} cumple 3 años de vigencia",
                $"El contrato {codigo} de {alerta.Empresa} cumple 3 años de vigencia. Se aproxima una renovación mayor."),
            "30 dias" => ($"Contrato {codigo} vence en 30 días o menos",
                $"El contrato {codigo} de {alerta.Empresa} vence el {vence} (faltan 30 días o menos). Coordine su renovación."),
            _ => ($"Contrato {codigo} vence en 90 días o menos",
                $"El contrato {codigo} de {alerta.Empresa} vence el {vence} (faltan 90 días o menos). Ya puede coordinar su renovación.")
        };
    }

    // ---------- CARR-009: ficha técnica de repetidoras ----------
    private const string MensajeFichaIncompleta = "Debe completar los datos técnicos obligatorios de la repetidora";

    public Task<List<RepetidoraDto>> ListarRepetidorasAsync(string? texto, bool? facturable) =>
        _alquilerDA.ListarRepetidorasAsync(Normalizar(texto), facturable);

    public async Task<RepetidoraDto> ObtenerRepetidoraPorSerieAsync(string numeroSerie)
    {
        var serie = Normalizar(numeroSerie)
            ?? throw new ReglaNegocioException("Debe indicar el número de serie de la repetidora.");

        var repetidora = await _alquilerDA.ObtenerRepetidoraPorSerieAsync(serie)
            ?? throw new ReglaNegocioException("El número de serie ingresado no existe en el inventario.");

        if (repetidora.Categoria != CategoriaRepetidora)
            throw new ReglaNegocioException("El número de serie ingresado no corresponde a una repetidora.");

        if (repetidora.IdContrato is null)
            throw new ReglaNegocioException("La repetidora no está asignada a ningún contrato de alquiler.");

        return repetidora;
    }

    public async Task<RepetidoraDto> GuardarFichaRepetidoraAsync(GuardarFichaRepetidoraDto dto, bool esEdicion, int idUsuario)
    {
        var serie = Normalizar(dto.NumeroSerie);
        var modelo = Normalizar(dto.Modelo);
        var frecuencia = Normalizar(dto.Frecuencia);
        var frecuenciaRx = Normalizar(dto.FrecuenciaRecepcion);
        var potencia = Normalizar(dto.Potencia);
        var direccion = Normalizar(dto.DireccionInstalacion);
        var accesorios = Normalizar(dto.Accesorios);
        var gps = Normalizar(dto.CoordenadasGPS);

        var faltantes = new List<string>();
        if (modelo is null) faltantes.Add("Modelo");
        if (serie is null) faltantes.Add("Número de serie");
        if (frecuencia is null) faltantes.Add("Frecuencia de transmisión");
        if (frecuenciaRx is null) faltantes.Add("Frecuencia de recepción");
        if (potencia is null) faltantes.Add("Potencia");
        if (direccion is null) faltantes.Add("Dirección de instalación");
        if (faltantes.Count > 0)
            throw new ValidacionException(MensajeFichaIncompleta, faltantes);

        var clasificacion = Normalizar(dto.Clasificacion);
        if (clasificacion is null)
            throw new ReglaNegocioException("Debe indicar si la repetidora es alquilada por Radifax o propia del cliente");

        clasificacion = Clasificaciones.FirstOrDefault(c => string.Equals(c, clasificacion, StringComparison.OrdinalIgnoreCase))
            ?? throw new ReglaNegocioException("La clasificación debe ser \"Alquilada por Radifax\" o \"Propia del cliente\".");

        if (frecuencia!.Length > 30 || frecuenciaRx!.Length > 30 || potencia!.Length > 30 || direccion!.Length > 200
            || (accesorios?.Length ?? 0) > 500)
            throw new ReglaNegocioException("Alguno de los datos excede la longitud permitida.");

        if (!frecuencia.Any(char.IsDigit) || !frecuenciaRx.Any(char.IsDigit))
            throw new ReglaNegocioException("Las frecuencias deben indicar un valor numérico (por ejemplo 450.125 MHz).");

        if (!potencia.Any(char.IsDigit))
            throw new ReglaNegocioException("La potencia debe indicar un valor numérico (por ejemplo 40 W).");

        if (gps is not null)
            gps = NormalizarCoordenadas(gps);

        var repetidora = await ObtenerRepetidoraPorSerieAsync(serie!);

        if (!string.Equals(modelo, repetidora.Modelo, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(modelo, $"{repetidora.Marca} {repetidora.Modelo}", StringComparison.OrdinalIgnoreCase))
            throw new ReglaNegocioException($"El modelo ingresado no coincide con el registrado en el inventario ({repetidora.Marca} {repetidora.Modelo}).");

        if (repetidora.EstadoContrato != "Activo")
            throw new ReglaNegocioException("Solo se puede registrar la ficha de una repetidora con contrato de alquiler activo.");

        if (repetidora.TieneFicha && !esEdicion)
            throw new ReglaNegocioException("La repetidora ya tiene una ficha técnica registrada. Edítela desde la consulta de la ficha.");

        if (!repetidora.TieneFicha && esEdicion)
            throw new ReglaNegocioException("La repetidora todavía no tiene ficha técnica registrada.");

        await _alquilerDA.GuardarFichaRepetidoraAsync(repetidora.IdEquipo, frecuencia, frecuenciaRx, potencia, accesorios, direccion, gps, clasificacion, idUsuario);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Repetidora", repetidora.IdEquipo,
            esEdicion ? "FICHA_REPETIDORA_ACTUALIZADA" : "FICHA_REPETIDORA_REGISTRADA",
            $"{repetidora.NumeroSerie} ({repetidora.Marca} {repetidora.Modelo}), contrato CT-{repetidora.IdContrato:0000}, {repetidora.Empresa}. {clasificacion} ({(clasificacion == ClasificacionAlquilada ? "facturable" : "sin cobro")})");

        return await ObtenerRepetidoraPorSerieAsync(repetidora.NumeroSerie);
    }

    // ---------- CARR-011: checklist previo a la instalación ----------
    public async Task<ChecklistRepetidoraDto> ObtenerChecklistAsync(string numeroSerie) =>
        await ArmarChecklistAsync(await ObtenerRepetidoraPorSerieAsync(numeroSerie));

    private async Task<ChecklistRepetidoraDto> ArmarChecklistAsync(RepetidoraDto repetidora)
    {
        var (requisitos, ultima, historial) = await _alquilerDA.ObtenerChecklistAsync(repetidora.IdEquipo);

        return new ChecklistRepetidoraDto
        {
            Repetidora = repetidora,
            Requisitos = requisitos,
            Ultima = ultima,
            Historial = historial,
            ListaParaInstalacion = ultima?.Completado == true,
            Pendientes = ultima is null ? new List<string>() : requisitos.Where(r => !r.Cumplido).Select(r => r.Nombre).ToList()
        };
    }

    public async Task<ChecklistRepetidoraDto> GuardarChecklistAsync(string numeroSerie, GuardarChecklistDto dto, int idUsuario)
    {
        var repetidora = await ObtenerRepetidoraPorSerieAsync(numeroSerie);

        if (!repetidora.TieneFicha)
            throw new ReglaNegocioException("Debe registrar la ficha técnica de la repetidora antes de completar el checklist.");

        if (repetidora.EstadoContrato != "Activo")
            throw new ReglaNegocioException("Solo se puede completar el checklist de una repetidora con contrato de alquiler activo.");

        var observaciones = Normalizar(dto.Observaciones);
        if ((observaciones?.Length ?? 0) > 1000)
            throw new ReglaNegocioException("Las observaciones no pueden superar los 1000 caracteres.");

        var (requisitos, _, _) = await _alquilerDA.ObtenerChecklistAsync(repetidora.IdEquipo);
        var cumplidos = (dto.Cumplidos ?? new List<int>()).Distinct().ToList();
        if (cumplidos.Any(id => requisitos.All(r => r.IdRequisito != id)))
            throw new ReglaNegocioException("Alguno de los requisitos indicados no existe en el checklist.");

        await _alquilerDA.GuardarChecklistAsync(repetidora.IdEquipo, cumplidos, observaciones, idUsuario);

        var resultado = await ArmarChecklistAsync(await ObtenerRepetidoraPorSerieAsync(repetidora.NumeroSerie));

        if (resultado.ListaParaInstalacion)
        {
            resultado.Mensaje = "El checklist se guardó completo. La repetidora está lista para instalación.";
        }
        else
        {
            resultado.Mensaje = "El checklist se guardó como incompleto.";
            resultado.Advertencia = $"La repetidora no está lista para instalación hasta cumplir todos los requisitos. Pendientes: {string.Join("; ", resultado.Pendientes)}.";
        }

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Repetidora", repetidora.IdEquipo,
            resultado.ListaParaInstalacion ? "CHECKLIST_INSTALACION_COMPLETO" : "CHECKLIST_INSTALACION_INCOMPLETO",
            $"{repetidora.NumeroSerie}, contrato CT-{repetidora.IdContrato:0000}: " +
            (resultado.ListaParaInstalacion ? "todos los requisitos cumplidos" : $"{resultado.Pendientes.Count} requisito(s) pendiente(s)"));

        return resultado;
    }

    private static (string Asunto, string Cuerpo) ArmarAlerta(AlertaContratoDto alerta, string codigo)
    {
        var vence = alerta.FechaVencimiento.ToString("dd/MM/yyyy");
        return alerta.Tipo switch
        {
            "3 anios" => (
                $"Contrato {codigo} cumple 3 años: renovación mayor próxima",
                $"<p>El contrato <strong>{codigo}</strong> de <strong>{alerta.Empresa}</strong> cumple 3 años de vigencia. Se aproxima una renovación mayor.</p>"),
            "30 dias" => (
                $"Contrato {codigo} por vencer en 30 días",
                $"<p>El contrato <strong>{codigo}</strong> de <strong>{alerta.Empresa}</strong> vence el <strong>{vence}</strong> (faltan 30 días o menos). Coordine su renovación con Radifax.</p>"),
            _ => (
                $"Contrato {codigo} por vencer en 90 días",
                $"<p>El contrato <strong>{codigo}</strong> de <strong>{alerta.Empresa}</strong> vence el <strong>{vence}</strong> (faltan 90 días o menos). Ya puede coordinar su renovación con Radifax.</p>")
        };
    }

    // ---------- CARR-007 / CARR-008: baterías ----------
    public Task<List<RadioDto>> ListarRadiosConBateriaPorCambiarAsync() => _alquilerDA.ListarRadiosAsync(null, null, true);

    public Task<List<CambioBateriaDto>> ListarBateriasAsync(int idRadio) => _alquilerDA.ListarBateriasAsync(idRadio);

    public async Task<RadioDto> RegistrarCambioBateriaAsync(RegistrarBateriaDto dto, int idUsuario)
    {
        if (dto.IdEquipo is null)
            throw new ValidacionException("Debe completar los campos obligatorios.", new List<string> { "Radio" });

        var serieBateria = Normalizar(dto.NumeroSerieBateria)
            ?? throw new ReglaNegocioException("Debe indicar el número de serie de la batería nueva.");

        if (serieBateria.Length > 50)
            throw new ReglaNegocioException("El número de serie de la batería no puede superar los 50 caracteres.");

        var fecha = dto.FechaCambio?.Date ?? DateTime.Today;
        if (fecha > DateTime.Today)
            throw new ReglaNegocioException("La fecha del cambio no puede ser futura.");

        var radio = (await _alquilerDA.ListarRadiosAsync(null, null)).FirstOrDefault(r => r.IdEquipo == dto.IdEquipo)
            ?? throw new ReglaNegocioException("El radio indicado no está asignado a un contrato.");

        await _alquilerDA.RegistrarBateriaAsync(radio.IdEquipo, serieBateria, fecha, idUsuario);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Equipo", radio.IdEquipo, "BATERIA_CAMBIADA",
            $"{radio.NumeroSerie}: nueva batería {serieBateria} instalada el {fecha:yyyy-MM-dd}");

        return (await _alquilerDA.ListarRadiosAsync(null, radio.NumeroSerie)).First();

    }

    // ---------- CARR-012: documentos técnicos de la repetidora ----------
    private const int TamanoMaximoDocumentoBytes = 10 * 1024 * 1024;
    private const string MensajeFormatoNoPermitido = "Formato de archivo no permitido, use PDF, JPG, PNG o XLSX";
    private static readonly string[] TiposDocumento = { "Plano", "Acta de instalación", "Otro" };

    // Extensión permitida -> tipo de contenido. Además se comprueba la firma del archivo para detectar
    // ejecutables u otros formatos renombrados con una extensión permitida.
    private static readonly Dictionary<string, string> ExtensionesDocumento = new(StringComparer.OrdinalIgnoreCase)
    {
        [".pdf"] = "application/pdf",
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".png"] = "image/png",
        [".xlsx"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };

    private static bool FirmaValida(string extension, byte[] datos) => extension.ToLowerInvariant() switch
    {
        ".pdf" => datos.Length >= 5 && datos[0] == 0x25 && datos[1] == 0x50 && datos[2] == 0x44 && datos[3] == 0x46 && datos[4] == 0x2D,
        ".jpg" or ".jpeg" => datos.Length >= 3 && datos[0] == 0xFF && datos[1] == 0xD8 && datos[2] == 0xFF,
        ".png" => datos.Length >= 8 && datos[0] == 0x89 && datos[1] == 0x50 && datos[2] == 0x4E && datos[3] == 0x47,
        ".xlsx" => datos.Length >= 4 && datos[0] == 0x50 && datos[1] == 0x4B && datos[2] == 0x03 && datos[3] == 0x04,
        _ => false
    };

    public async Task<List<DocumentoRepetidoraDto>> ListarDocumentosAsync(string numeroSerie)
    {
        var repetidora = await ObtenerRepetidoraPorSerieAsync(numeroSerie);
        return await _alquilerDA.ListarDocumentosAsync(repetidora.IdEquipo);
    }

    public async Task<DocumentoRepetidoraDto> AdjuntarDocumentoAsync(string numeroSerie, SubirDocumentoDto dto, int idUsuario)
    {
        var repetidora = await ObtenerRepetidoraPorSerieAsync(numeroSerie);

        if (!repetidora.TieneFicha)
            throw new ReglaNegocioException("Debe registrar la ficha técnica de la repetidora antes de adjuntar documentos.");

        var nombreArchivo = Path.GetFileName(Normalizar(dto.NombreArchivo) ?? string.Empty);
        if (nombreArchivo.Length == 0 || dto.Contenido is null)
            throw new ReglaNegocioException("Debe seleccionar el archivo que desea adjuntar.");

        var extension = Path.GetExtension(nombreArchivo);
        if (!ExtensionesDocumento.TryGetValue(extension, out var tipoContenido))
            throw new ReglaNegocioException(MensajeFormatoNoPermitido);

        if (dto.Contenido.Length > TamanoMaximoDocumentoBytes)
            throw new ReglaNegocioException("El archivo supera el tamaño máximo permitido de 10 MB");

        if (dto.Contenido.Length == 0)
            throw new ReglaNegocioException("El archivo seleccionado está vacío.");

        if (!FirmaValida(extension, dto.Contenido))
            throw new ReglaNegocioException(MensajeFormatoNoPermitido);

        var tipo = Normalizar(dto.TipoDocumento) ?? "Otro";
        tipo = TiposDocumento.FirstOrDefault(t => string.Equals(t, tipo, StringComparison.OrdinalIgnoreCase))
            ?? throw new ReglaNegocioException("El tipo de documento debe ser Plano, Acta de instalación u Otro.");

        var nombreDocumento = Normalizar(dto.NombreDocumento) ?? Path.GetFileNameWithoutExtension(nombreArchivo);
        if (nombreDocumento.Length > 150 || nombreArchivo.Length > 255)
            throw new ReglaNegocioException("El nombre del documento excede la longitud permitida.");

        var idDocumento = await _alquilerDA.InsertarDocumentoAsync(repetidora.IdEquipo, tipo, nombreDocumento, nombreArchivo,
            tipoContenido, dto.Contenido, idUsuario);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Repetidora", repetidora.IdEquipo, "DOCUMENTO_REPETIDORA_ADJUNTADO",
            $"{repetidora.NumeroSerie}: {tipo} \"{nombreArchivo}\" ({dto.Contenido.Length / 1024} KB)");

        return (await _alquilerDA.ListarDocumentosAsync(repetidora.IdEquipo)).First(d => d.IdDocumento == idDocumento);
    }

    public async Task<DocumentoArchivoDto> ObtenerDocumentoAsync(int idDocumento) =>
        await _alquilerDA.ObtenerDocumentoAsync(idDocumento)
            ?? throw new ReglaNegocioException("El documento indicado no existe.");

    // ---------- CARR-013: bitácora de mantenimiento (se alimenta sola al cerrar tickets) ----------
    public async Task<List<BitacoraMantenimientoDto>> ObtenerBitacoraRepetidoraAsync(string numeroSerie)
    {
        var repetidora = await ObtenerRepetidoraPorSerieAsync(numeroSerie);
        return await _alquilerDA.ListarBitacoraRepetidoraAsync(repetidora.IdEquipo);
    }

    // Acepta "latitud, longitud" en grados decimales y lo guarda con formato uniforme.
    private static string NormalizarCoordenadas(string texto)
    {
        const string mensaje = "Las coordenadas GPS no son válidas. Use el formato latitud, longitud (por ejemplo 9.934100, -84.087700).";

        var partes = texto.Split(new[] { ',', ';' }, StringSplitOptions.TrimEntries);
        if (partes.Length != 2
            || !double.TryParse(partes[0], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var lat)
            || !double.TryParse(partes[1], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var lon)
            || lat is < -90 or > 90 || lon is < -180 or > 180)
            throw new ReglaNegocioException(mensaje);

        return string.Create(System.Globalization.CultureInfo.InvariantCulture, $"{lat:0.000000}, {lon:0.000000}");
    }

    private static string? Normalizar(string? valor) => string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();
}
