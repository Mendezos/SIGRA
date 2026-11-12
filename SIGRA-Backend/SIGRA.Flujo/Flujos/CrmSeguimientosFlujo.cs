using System.Globalization;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.Flujo.Flujos;

// CRMGPSC-015 a 018 y 024: seguimientos, agenda y contactos periódicos.
// Todas las fechas y horas que se programan o registran son hora de pared de Costa Rica (sin zona horaria).
public class CrmSeguimientosFlujo(ICrmSeguimientosDA da, ICrmCatalogosDA catalogos, IAuditoriaDA auditoria, TimeProvider? reloj = null) : ICrmSeguimientosFlujo
{
    private const string ModuloAuditoria = "CRM";
    private const int MaxMotivo = 500;
    private const int MaxResultado = 500;
    private const int MaxObservaciones = 1000;
    private const int MaxProximoPaso = 500;
    private const int DiasAgendaPorDefecto = 7;

    private const string MensajeFechaHoraInvalida = "La fecha u hora ingresada no es válida; inserte una fecha y hora futuras.";
    private const string MensajeFechaHoraPasada = "La fecha y hora del seguimiento ya pasaron; inserte una fecha y hora futuras.";
    private const string MensajeSeguimientoCerrado = "El seguimiento ya está cerrado; cree un seguimiento nuevo.";
    private const string MensajeSeguimientoInexistente = "El seguimiento indicado no existe.";
    private const string MensajeSerieInexistente = "La serie indicada no existe.";
    private const string MensajeResponsableInactivo = "El responsable seleccionado está inactivo o no es un vendedor; elija a otro vendedor.";
    private const string MensajeContactoInactivo = "El contacto seleccionado está inactivo; elija un contacto activo.";
    private const string MensajeSoloResponsable = "Solo el responsable del seguimiento o un administrador puede modificarlo.";

    private static readonly TimeZoneInfo ZonaCostaRica = ObtenerZonaCostaRica();
    private static readonly CultureInfo Invariante = CultureInfo.InvariantCulture;

    private readonly TimeProvider _reloj = reloj ?? TimeProvider.System;

    // Costa Rica no tiene horario de verano (UTC-6); si el sistema no conoce la zona se usa ese desfase fijo.
    private static TimeZoneInfo ObtenerZonaCostaRica()
    {
        foreach (var id in new[] { "Central America Standard Time", "America/Costa_Rica" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
        }
        return TimeZoneInfo.CreateCustomTimeZone("CostaRica", TimeSpan.FromHours(-6), "Costa Rica", "Costa Rica");
    }

    /// <summary>Hora actual de Costa Rica, sin fracciones de segundo (la base de datos guarda segundos).</summary>
    private DateTime AhoraCostaRica()
    {
        var ahora = TimeZoneInfo.ConvertTime(_reloj.GetUtcNow(), ZonaCostaRica).DateTime;
        return new DateTime(ahora.Ticks - ahora.Ticks % TimeSpan.TicksPerSecond, DateTimeKind.Unspecified);
    }

    // ---------- Utilidades ----------
    private static string? Normalizar(string? texto)
    {
        var limpio = texto?.Trim();
        return string.IsNullOrEmpty(limpio) ? null : limpio;
    }

    private static string? Canonico(string? valor, string[] permitidos) =>
        valor is null ? null : permitidos.FirstOrDefault(p => string.Equals(p, valor, StringComparison.OrdinalIgnoreCase));

    private static bool TryFecha(string? texto, out DateTime fecha) =>
        DateTime.TryParseExact(texto, "yyyy-MM-dd", Invariante, DateTimeStyles.None, out fecha);

    private static bool TryHora(string? texto, out TimeSpan hora)
    {
        if (DateTime.TryParseExact(texto, new[] { "HH:mm", "HH:mm:ss" }, Invariante, DateTimeStyles.None, out var d))
        {
            hora = d.TimeOfDay;
            return true;
        }
        hora = default;
        return false;
    }

    private static bool TryFechaHora(string? texto, out DateTime fechaHora) =>
        DateTime.TryParseExact(texto, new[] { "yyyy-MM-dd'T'HH:mm", "yyyy-MM-dd'T'HH:mm:ss" }, Invariante, DateTimeStyles.None, out fechaHora);

    private static string Texto(DateTime fecha) => fecha.ToString("dd/MM/yyyy HH:mm", Invariante);

    private static string Cambio(string campo, string? anterior, string? nuevo) => $"{campo}: «{anterior ?? "sin dato"}» → «{nuevo ?? "sin dato"}»";

    private static void ValidarLongitud(string? valor, int maximo, string campo)
    {
        if (valor is not null && valor.Length > maximo)
            throw new ReglaNegocioException($"{campo} no puede superar los {maximo} caracteres.");
    }

    private static void ValidarPuedeModificar(int idResponsable, int idUsuario, bool esAdministrador)
    {
        if (!esAdministrador && idResponsable != idUsuario)
            throw new AccesoDenegadoException(MensajeSoloResponsable);
    }

    // ---------- CRMGPSC-016: agenda ----------
    public async Task<List<CrmSeguimientoDto>> ListarAgendaAsync(CrmAgendaConsultaDto consulta, int idUsuario)
    {
        var prioridad = Normalizar(consulta.Prioridad);
        if (prioridad is not null)
            prioridad = Canonico(prioridad, CrmCatalogos.PrioridadesSeguimiento)
                ?? throw new ReglaNegocioException("La prioridad debe ser Baja, Media o Alta.");

        var tipo = Normalizar(consulta.Tipo);
        if (tipo is not null)
            tipo = Canonico(tipo, CrmCatalogos.TiposSeguimiento)
                ?? throw new ReglaNegocioException($"El tipo de seguimiento debe ser uno de los siguientes: {string.Join(", ", CrmCatalogos.TiposSeguimiento)}.");

        // Por omisión la agenda muestra los seguimientos abiertos (Pendiente y Atrasado).
        var estado = Normalizar(consulta.Estado);
        var soloAbiertos = estado is null || string.Equals(estado, "Abiertos", StringComparison.OrdinalIgnoreCase);
        string? estadoConcreto = null;
        if (!soloAbiertos && !string.Equals(estado, "Todos", StringComparison.OrdinalIgnoreCase))
            estadoConcreto = Canonico(estado, CrmCatalogos.EstadosSeguimiento)
                ?? throw new ReglaNegocioException($"El estado debe ser uno de los siguientes: {string.Join(", ", CrmCatalogos.EstadosSeguimiento)}, Abiertos o Todos.");

        DateTime? desde = null, hasta = null;
        var textoDesde = Normalizar(consulta.Desde);
        var textoHasta = Normalizar(consulta.Hasta);
        if (textoDesde is not null)
            desde = TryFecha(textoDesde, out var d) ? d : throw new ReglaNegocioException("La fecha inicial del rango no es válida.");
        if (textoHasta is not null)
            hasta = TryFecha(textoHasta, out var h) ? h : throw new ReglaNegocioException("La fecha final del rango no es válida.");
        if (desde is not null && hasta is not null && desde > hasta)
            throw new ReglaNegocioException("La fecha inicial del rango no puede ser posterior a la fecha final.");

        // Sin rango explícito: desde hoy y los próximos 7 días (los atrasados se ven eligiendo ese estado, que no limita por fechas).
        if (!consulta.SinRango && desde is null && hasta is null && estadoConcreto != "Atrasado")
        {
            desde = AhoraCostaRica().Date;
            hasta = desde.Value.AddDays(DiasAgendaPorDefecto);
        }

        var filtro = new CrmSeguimientoFiltro
        {
            IdResponsable = consulta.TodosResponsables ? null : consulta.IdResponsable ?? idUsuario,
            Desde = desde,
            Hasta = hasta,
            Prioridad = prioridad,
            Tipo = tipo,
            Estado = estadoConcreto,
            SoloAbiertos = soloAbiertos,
            Texto = Normalizar(consulta.Texto)
        };
        return await da.ListarAsync(filtro);
    }

    public async Task<CrmSeguimientoDto> ObtenerSeguimientoAsync(int idSeguimiento) =>
        await da.ObtenerAsync(idSeguimiento) ?? throw new ReglaNegocioException(MensajeSeguimientoInexistente);

    // ---------- CRMGPSC-015: programar ----------
    public async Task<CrmSeguimientoDto> CrearSeguimientoAsync(CrearSeguimientoDto dto, int idUsuario)
    {
        var tipoEmpresa = Normalizar(dto.TipoEmpresa);
        var tipo = Normalizar(dto.Tipo);
        var fecha = Normalizar(dto.Fecha);
        var hora = Normalizar(dto.Hora);
        var motivo = Normalizar(dto.Motivo);
        var prioridad = Normalizar(dto.Prioridad) ?? "Media";

        // Si quien programa es un vendedor y no elige responsable, el responsable es él mismo.
        var vendedores = await catalogos.ListarVendedoresAsync();
        var idResponsable = dto.IdResponsable is > 0 ? dto.IdResponsable
            : vendedores.Any(v => v.IdUsuario == idUsuario) ? idUsuario : (int?)null;

        var faltantes = new List<string>();
        if (tipoEmpresa is null || dto.IdEmpresa is null or <= 0) faltantes.Add("Empresa (prospecto o cliente)");
        if (tipo is null) faltantes.Add("Tipo de seguimiento");
        if (fecha is null) faltantes.Add("Fecha");
        if (hora is null) faltantes.Add("Hora");
        if (motivo is null) faltantes.Add("Motivo");
        if (idResponsable is null) faltantes.Add("Responsable");
        if (faltantes.Count > 0)
            throw new ValidacionException("Debe completar los campos obligatorios para programar el seguimiento.", faltantes);

        tipoEmpresa = Canonico(tipoEmpresa, CrmCatalogos.TiposEmpresa)
            ?? throw new ReglaNegocioException("El tipo de empresa debe ser Prospecto o Cliente.");
        tipo = Canonico(tipo, CrmCatalogos.TiposSeguimiento)
            ?? throw new ReglaNegocioException($"El tipo de seguimiento debe ser uno de los siguientes: {string.Join(", ", CrmCatalogos.TiposSeguimiento)}.");
        prioridad = Canonico(prioridad, CrmCatalogos.PrioridadesSeguimiento)
            ?? throw new ReglaNegocioException("La prioridad debe ser Baja, Media o Alta.");
        ValidarLongitud(motivo, MaxMotivo, "El motivo");

        if (!TryFecha(fecha, out var dia) || !TryHora(hora, out var horaDelDia))
            throw new ReglaNegocioException(MensajeFechaHoraInvalida);
        var fechaHora = dia.Date + horaDelDia;
        if (fechaHora <= AhoraCostaRica())
            throw new ReglaNegocioException(MensajeFechaHoraPasada);

        var empresa = await ValidarEmpresaAsync(tipoEmpresa, dto.IdEmpresa!.Value, "seguimientos");
        await ValidarContactoAsync(tipoEmpresa, empresa.IdEmpresa, dto.IdContactoEmpresa);
        if (vendedores.All(v => v.IdUsuario != idResponsable))
            throw new ReglaNegocioException(MensajeResponsableInactivo);

        var id = await da.CrearAsync(tipoEmpresa, empresa.IdEmpresa, dto.IdContactoEmpresa, tipo, fechaHora, motivo!, prioridad, idResponsable!.Value, idUsuario);
        var creado = await ObtenerSeguimientoAsync(id);

        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "Seguimiento", id, "SEGUIMIENTO_CREADO",
            $"{creado.Codigo}: {tipo} a {empresa.Empresa} ({tipoEmpresa}) el {Texto(fechaHora)}. Prioridad {prioridad}. " +
            $"Responsable: {creado.Responsable}. Motivo: {motivo}");
        return creado;
    }

    private async Task<CrmEmpresaBasicaDto> ValidarEmpresaAsync(string tipoEmpresa, int idEmpresa, string que)
    {
        var empresa = await catalogos.ObtenerEmpresaAsync(tipoEmpresa, idEmpresa)
            ?? throw new ReglaNegocioException("La empresa indicada no existe.");
        if (!empresa.Activa)
            throw new ReglaNegocioException($"La empresa indicada no está activa: solo se programan {que} para prospectos en gestión o clientes activos.");
        return empresa;
    }

    private async Task ValidarContactoAsync(string tipoEmpresa, int idEmpresa, int? idContacto)
    {
        if (idContacto is null) return;
        var contacto = (await catalogos.ListarContactosAsync(tipoEmpresa, idEmpresa, false)).FirstOrDefault(c => c.IdContactoEmpresa == idContacto)
            ?? throw new ReglaNegocioException("El contacto seleccionado no pertenece a la empresa indicada.");
        if (!contacto.Activo)
            throw new ReglaNegocioException(MensajeContactoInactivo);
    }

    // ---------- CRMGPSC-017: reprogramar ----------
    public async Task<CrmSeguimientoAccionDto> ReprogramarAsync(int idSeguimiento, ReprogramarSeguimientoDto dto, int idUsuario, bool esAdministrador)
    {
        var actual = await ObtenerSeguimientoAsync(idSeguimiento);
        ValidarPuedeModificar(actual.IdResponsable, idUsuario, esAdministrador);
        if (actual.Estado is "Completado" or "Cancelado")
            throw new ReglaNegocioException(MensajeSeguimientoCerrado);

        var fecha = Normalizar(dto.Fecha);
        var hora = Normalizar(dto.Hora);
        var motivo = Normalizar(dto.Motivo);
        var faltantes = new List<string>();
        if (fecha is null) faltantes.Add("Nueva fecha");
        if (hora is null) faltantes.Add("Nueva hora");
        if (motivo is null) faltantes.Add("Motivo de la reprogramación");
        if (faltantes.Count > 0)
            throw new ValidacionException("Debe completar los campos obligatorios para reprogramar el seguimiento.", faltantes);
        ValidarLongitud(motivo, MaxMotivo, "El motivo de la reprogramación");

        if (!TryFecha(fecha, out var dia) || !TryHora(hora, out var horaDelDia))
            throw new ReglaNegocioException(MensajeFechaHoraInvalida);
        var nueva = dia.Date + horaDelDia;
        if (nueva <= AhoraCostaRica())
            throw new ReglaNegocioException($"La nueva fecha y hora ya pasaron; el seguimiento conserva su programación anterior ({Texto(actual.FechaHora)}). Inserte una fecha y hora futuras.");

        await da.ReprogramarAsync(idSeguimiento, nueva, motivo!, idUsuario);
        var actualizado = await ObtenerSeguimientoAsync(idSeguimiento);

        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "Seguimiento", idSeguimiento, "SEGUIMIENTO_REPROGRAMADO",
            $"{actual.Codigo}: {Cambio("Fecha y hora", Texto(actual.FechaHora), Texto(nueva))}; {Cambio("Estado", actual.Estado, actualizado.Estado)}; " +
            $"Motivo de la reprogramación: «{motivo}»");

        return new CrmSeguimientoAccionDto
        {
            Aplicado = true,
            Mensaje = $"El seguimiento {actual.Codigo} se reprogramó para el {Texto(nueva)}. La programación anterior ({Texto(actual.FechaHora)}) quedó en el historial.",
            Seguimiento = actualizado
        };
    }

    // ---------- CRMGPSC-018: completar y cancelar ----------
    public async Task<CrmSeguimientoAccionDto> CompletarAsync(int idSeguimiento, CompletarSeguimientoDto dto, int idUsuario, bool esAdministrador)
    {
        var actual = await ObtenerSeguimientoAsync(idSeguimiento);
        ValidarPuedeModificar(actual.IdResponsable, idUsuario, esAdministrador);
        if (actual.Estado is "Completado" or "Cancelado")
            return YaCerrado(actual);

        var resultado = Normalizar(dto.Resultado);
        var observaciones = Normalizar(dto.Observaciones);
        var proximoPaso = Normalizar(dto.ProximoPaso);
        if (resultado is null)
            throw new ValidacionException("Debe registrar el resultado del seguimiento para completarlo.", new List<string> { "Resultado" });
        ValidarLongitud(resultado, MaxResultado, "El resultado");
        ValidarLongitud(observaciones, MaxObservaciones, "Las observaciones");
        ValidarLongitud(proximoPaso, MaxProximoPaso, "El próximo paso");

        var ahora = AhoraCostaRica();
        var fechaReal = ahora;
        var textoFechaReal = Normalizar(dto.FechaReal);
        if (textoFechaReal is not null)
        {
            if (!TryFechaHora(textoFechaReal, out fechaReal))
                throw new ReglaNegocioException("La fecha real no es válida.");
            if (fechaReal > ahora)
                throw new ReglaNegocioException("La fecha real no puede ser futura.");
        }

        var aplicado = await da.CompletarAsync(idSeguimiento, fechaReal, resultado, observaciones, proximoPaso, idUsuario);
        var actualizado = await ObtenerSeguimientoAsync(idSeguimiento);
        if (!aplicado)
            return YaCerrado(actualizado);

        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "Seguimiento", idSeguimiento, "SEGUIMIENTO_COMPLETADO",
            $"{actual.Codigo}: {Cambio("Estado", actual.Estado, "Completado")}; Fecha real: «{Texto(fechaReal)}»; Resultado: «{resultado}»" +
            (proximoPaso is null ? "" : $"; Próximo paso: «{proximoPaso}»") + $". Interacción vinculada #{actualizado.IdInteraccion}");

        return new CrmSeguimientoAccionDto
        {
            Aplicado = true,
            Mensaje = $"El seguimiento {actual.Codigo} se completó y quedó registrado en el historial comercial de {actual.Empresa}.",
            Seguimiento = actualizado
        };
    }

    public async Task<CrmSeguimientoAccionDto> CancelarAsync(int idSeguimiento, CancelarSeguimientoDto dto, int idUsuario, bool esAdministrador)
    {
        var actual = await ObtenerSeguimientoAsync(idSeguimiento);
        ValidarPuedeModificar(actual.IdResponsable, idUsuario, esAdministrador);
        if (actual.Estado is "Completado" or "Cancelado")
            return YaCerrado(actual);

        var motivo = Normalizar(dto.Motivo);
        if (motivo is null)
            throw new ValidacionException("Debe indicar el motivo de la cancelación.", new List<string> { "Motivo de la cancelación" });
        ValidarLongitud(motivo, MaxMotivo, "El motivo de la cancelación");

        var aplicado = await da.CancelarAsync(idSeguimiento, motivo, idUsuario);
        var actualizado = await ObtenerSeguimientoAsync(idSeguimiento);
        if (!aplicado)
            return YaCerrado(actualizado);

        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "Seguimiento", idSeguimiento, "SEGUIMIENTO_CANCELADO",
            $"{actual.Codigo}: {Cambio("Estado", actual.Estado, "Cancelado")}; Motivo de la cancelación: «{motivo}». " +
            $"Programación original conservada: {Texto(actual.FechaHoraOriginal)}");

        return new CrmSeguimientoAccionDto
        {
            Aplicado = true,
            Mensaje = $"El seguimiento {actual.Codigo} se canceló. La planificación original ({Texto(actual.FechaHoraOriginal)}) se conserva.",
            Seguimiento = actualizado
        };
    }

    // Un seguimiento ya cerrado no se vuelve a cerrar: se devuelve su estado actual.
    private static CrmSeguimientoAccionDto YaCerrado(CrmSeguimientoDto seguimiento) => new()
    {
        Aplicado = false,
        Mensaje = $"El seguimiento {seguimiento.Codigo} ya está {seguimiento.Estado}; no se repite el cierre.",
        Seguimiento = seguimiento
    };

    // ---------- CRMGPSC-024: contactos periódicos ----------
    public async Task<List<CrmSerieDto>> ListarSeriesAsync(CrmSerieFiltroDto filtro)
    {
        var estado = Normalizar(filtro.Estado);
        if (estado is not null && !string.Equals(estado, "Todas", StringComparison.OrdinalIgnoreCase))
            estado = new[] { "Activa", "Cancelada" }.FirstOrDefault(e => string.Equals(e, estado, StringComparison.OrdinalIgnoreCase))
                ?? throw new ReglaNegocioException("El estado de la serie debe ser Activa o Cancelada.");
        else
            estado = null;
        return await da.ListarSeriesAsync(filtro.IdResponsable, estado, Normalizar(filtro.Texto));
    }

    public async Task<CrmSerieDetalleDto> ObtenerSerieAsync(int idSerie) =>
        await da.ObtenerSerieAsync(idSerie) ?? throw new ReglaNegocioException(MensajeSerieInexistente);

    public async Task<CrmSerieDetalleDto> CrearSerieAsync(CrearSerieDto dto, int idUsuario)
    {
        var tipoEmpresa = Normalizar(dto.TipoEmpresa);
        var periodicidad = Normalizar(dto.Periodicidad);
        var fecha = Normalizar(dto.FechaInicial);
        var hora = Normalizar(dto.Hora);
        var tipo = Normalizar(dto.Tipo);
        var motivo = Normalizar(dto.Motivo);
        var prioridad = Normalizar(dto.Prioridad) ?? "Media";

        var vendedores = await catalogos.ListarVendedoresAsync();
        var idResponsable = dto.IdResponsable is > 0 ? dto.IdResponsable
            : vendedores.Any(v => v.IdUsuario == idUsuario) ? idUsuario : (int?)null;

        var faltantes = new List<string>();
        if (tipoEmpresa is null || dto.IdEmpresa is null or <= 0) faltantes.Add("Empresa (prospecto o cliente)");
        if (periodicidad is null) faltantes.Add("Periodicidad");
        if (fecha is null) faltantes.Add("Fecha inicial");
        if (hora is null) faltantes.Add("Hora");
        if (tipo is null) faltantes.Add("Tipo de seguimiento");
        if (motivo is null) faltantes.Add("Motivo");
        if (idResponsable is null) faltantes.Add("Responsable");
        if (faltantes.Count > 0)
            throw new ValidacionException("Debe completar los campos obligatorios para programar el contacto periódico.", faltantes);

        tipoEmpresa = Canonico(tipoEmpresa, CrmCatalogos.TiposEmpresa)
            ?? throw new ReglaNegocioException("El tipo de empresa debe ser Prospecto o Cliente.");
        periodicidad = Canonico(periodicidad, CrmCatalogos.Periodicidades)
            ?? throw new ReglaNegocioException($"La periodicidad debe ser una de las siguientes: {string.Join(", ", CrmCatalogos.Periodicidades)}.");
        tipo = Canonico(tipo, CrmCatalogos.TiposSeguimiento)
            ?? throw new ReglaNegocioException($"El tipo de seguimiento debe ser uno de los siguientes: {string.Join(", ", CrmCatalogos.TiposSeguimiento)}.");
        prioridad = Canonico(prioridad, CrmCatalogos.PrioridadesSeguimiento)
            ?? throw new ReglaNegocioException("La prioridad debe ser Baja, Media o Alta.");
        ValidarLongitud(motivo, MaxMotivo, "El motivo");

        if (!TryFecha(fecha, out var dia))
            throw new ReglaNegocioException("La fecha inicial no es válida; corrija la fecha.");
        if (!TryHora(hora, out var horaDelDia))
            throw new ReglaNegocioException("La hora no es válida; corrija la hora (formato HH:mm).");
        var ahora = AhoraCostaRica();
        if (dia.Date < ahora.Date)
            throw new ReglaNegocioException("La fecha inicial es anterior a la fecha actual; corrija la fecha.");
        if (dia.Date + horaDelDia <= ahora)
            throw new ReglaNegocioException("La fecha y hora iniciales ya pasaron; corrija la fecha o la hora.");

        var empresa = await ValidarEmpresaAsync(tipoEmpresa, dto.IdEmpresa!.Value, "contactos periódicos");
        await ValidarContactoAsync(tipoEmpresa, empresa.IdEmpresa, dto.IdContactoEmpresa);
        if (vendedores.All(v => v.IdUsuario != idResponsable))
            throw new ReglaNegocioException(MensajeResponsableInactivo);

        var id = await da.CrearSerieAsync(tipoEmpresa, empresa.IdEmpresa, dto.IdContactoEmpresa, periodicidad, dia.Date, horaDelDia, tipo, motivo!,
            prioridad, idResponsable!.Value, idUsuario);
        var serie = await ObtenerSerieAsync(id);

        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "SerieContacto", id, "SERIE_CONTACTO_CREADA",
            $"{serie.Codigo}: contacto {periodicidad.ToLowerInvariant()} ({tipo}) a {empresa.Empresa} ({tipoEmpresa}) desde el {Texto(dia.Date + horaDelDia)}. " +
            $"{serie.Total} seguimiento(s) generado(s). Responsable: {serie.Responsable}. Motivo: {motivo}");
        return serie;
    }

    public async Task<CrmSerieAccionDto> CancelarSerieAsync(int idSerie, CancelarSerieDto dto, int idUsuario, bool esAdministrador)
    {
        var actual = await ObtenerSerieAsync(idSerie);
        if (!esAdministrador && actual.IdResponsable != idUsuario)
            throw new AccesoDenegadoException("Solo el responsable de la serie o un administrador puede cancelarla.");

        if (actual.Estado == "Cancelada")
            return SerieYaCancelada(actual);

        var motivo = Normalizar(dto.Motivo);
        if (motivo is null)
            throw new ValidacionException("Debe indicar el motivo de la cancelación de la serie.", new List<string> { "Motivo de la cancelación" });
        ValidarLongitud(motivo, MaxMotivo, "El motivo de la cancelación");

        var (aplicado, cancelados) = await da.CancelarSerieAsync(idSerie, motivo, idUsuario);
        var serie = await ObtenerSerieAsync(idSerie);
        if (!aplicado)
            return SerieYaCancelada(serie);

        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "SerieContacto", idSerie, "SERIE_CONTACTO_CANCELADA",
            $"{actual.Codigo}: {Cambio("Estado", actual.Estado, "Cancelada")}; Motivo de la cancelación: «{motivo}». " +
            $"{cancelados} seguimiento(s) futuros cancelados; {serie.Completados} completado(s) y {serie.Atrasados} atrasado(s) se conservan");

        return new CrmSerieAccionDto
        {
            Aplicado = true,
            SeguimientosCancelados = cancelados,
            Mensaje = $"Se canceló la serie {actual.Codigo}: {cancelados} seguimiento(s) futuros cancelados. " +
                      "Se conservaron los seguimientos completados y los vencidos sin cerrar.",
            Serie = serie
        };
    }

    private static CrmSerieAccionDto SerieYaCancelada(CrmSerieDetalleDto serie) => new()
    {
        Aplicado = false,
        Mensaje = $"La serie {serie.Codigo} ya está Cancelada; no se repite la cancelación.",
        Serie = serie
    };
}
