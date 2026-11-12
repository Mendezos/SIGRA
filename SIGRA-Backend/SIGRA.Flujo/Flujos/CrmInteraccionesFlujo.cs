using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.Flujo.Flujos;

// CRMGPSC-013 y 014: notas, interacciones e historial comercial
public class CrmInteraccionesFlujo(ICrmInteraccionesDA da, ICrmCatalogosDA catalogos, IAuditoriaDA auditoria) : ICrmInteraccionesFlujo
{
    private const string ModuloAuditoria = "CRM";
    private const int MaxDescripcion = 2000;
    private const int MaxTextoNota = 2000;
    private const int MaxResultado = 500;
    private const int MaxProximoPaso = 500;
    private static readonly DateTime FechaMinima = new(2000, 1, 1);

    public const string MensajeFechaFutura = "La fecha de la interacción no puede ser futura. Si es una actividad por hacer, programe un seguimiento.";
    public const string MensajeRangoInvalido = "La fecha inicial no puede ser posterior a la final";
    public const string MensajeSinActividad = "La empresa no tiene actividad comercial registrada";

    private static readonly string[] TiposMovimiento =
    {
        HistorialMovimientoDto.MovimientoInteraccion, HistorialMovimientoDto.MovimientoNota, HistorialMovimientoDto.MovimientoCotizacion
    };

    // ---------- CRMGPSC-013: registrar interacción ----------
    public async Task<InteraccionRegistradaDto> RegistrarInteraccionAsync(RegistrarInteraccionDto dto, int idUsuario)
    {
        var tipoEmpresa = Normalizar(dto.TipoEmpresa);
        var tipo = Normalizar(dto.Tipo);
        var descripcion = Normalizar(dto.Descripcion);
        var resultado = Normalizar(dto.Resultado);
        var proximoPaso = Normalizar(dto.ProximoPaso);

        var faltantes = new List<string>();
        if (tipoEmpresa is null || dto.IdEmpresa is null or <= 0) faltantes.Add("Empresa");
        if (tipo is null) faltantes.Add("Tipo de interacción");
        if (dto.Fecha is null) faltantes.Add("Fecha y hora");
        if (descripcion is null) faltantes.Add("Descripción");
        if (faltantes.Count > 0)
            throw new ValidacionException("Debe completar los campos obligatorios para registrar la interacción.", faltantes);

        tipoEmpresa = ValidarTipoEmpresa(tipoEmpresa!);
        tipo = CrmCatalogos.TiposInteraccion.FirstOrDefault(t => Igual(t, tipo))
            ?? throw new ReglaNegocioException($"El tipo de interacción no es válido. Use uno de estos: {string.Join(", ", CrmCatalogos.TiposInteraccion)}.");

        if (descripcion!.Length > MaxDescripcion)
            throw new ReglaNegocioException($"La descripción no puede superar los {MaxDescripcion} caracteres.");
        if (resultado is not null && resultado.Length > MaxResultado)
            throw new ReglaNegocioException($"El resultado no puede superar los {MaxResultado} caracteres.");
        if (proximoPaso is not null && proximoPaso.Length > MaxProximoPaso)
            throw new ReglaNegocioException($"El próximo paso no puede superar los {MaxProximoPaso} caracteres.");

        // La hora que se registra es hora de Costa Rica, sin zona horaria; se compara con "ahora" en Costa Rica.
        var fecha = dto.Fecha!.Value;
        if (fecha < FechaMinima)
            throw new ReglaNegocioException("La fecha de la interacción no es válida.");
        if (fecha > AhoraCostaRica())
            throw new ReglaNegocioException(MensajeFechaFutura);

        var idEmpresa = dto.IdEmpresa!.Value;
        var empresa = await ObtenerEmpresaRegistrableAsync(tipoEmpresa, idEmpresa, "interacciones");

        if (dto.IdContactoEmpresa is not null)
        {
            var contacto = (await catalogos.ListarContactosAsync(tipoEmpresa, idEmpresa, false))
                .FirstOrDefault(c => c.IdContactoEmpresa == dto.IdContactoEmpresa)
                ?? throw new ReglaNegocioException("El contacto seleccionado no pertenece a la empresa.");
            if (!contacto.Activo)
                throw new ReglaNegocioException("El contacto seleccionado está inactivo; elija un contacto activo.");
        }

        if (dto.IdCotizacion is not null
            && (await da.ListarCotizacionesAsync(tipoEmpresa, idEmpresa)).All(c => c.IdCotizacion != dto.IdCotizacion))
            throw new ReglaNegocioException("La cotización seleccionada no pertenece a la empresa.");

        var registrada = await da.RegistrarInteraccionAsync(tipoEmpresa, idEmpresa, idUsuario, tipo, fecha, descripcion,
            resultado, proximoPaso, dto.IdContactoEmpresa, dto.IdCotizacion);

        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "InteraccionCRM", registrada.IdInteraccion, "INTERACCION_REGISTRADA",
            $"{registrada.Codigo}: {tipo} con {empresa.Empresa} ({tipoEmpresa}) el {fecha:dd/MM/yyyy HH:mm}");
        return registrada;
    }

    // ---------- CRMGPSC-013: registrar nota ----------
    public async Task<NotaRegistradaDto> RegistrarNotaAsync(RegistrarNotaDto dto, int idUsuario)
    {
        var tipoEmpresa = Normalizar(dto.TipoEmpresa);
        var categoria = Normalizar(dto.Categoria);
        var texto = Normalizar(dto.Texto);
        var visibilidad = Normalizar(dto.Visibilidad) ?? "Equipo";

        var faltantes = new List<string>();
        if (tipoEmpresa is null || dto.IdEmpresa is null or <= 0) faltantes.Add("Empresa");
        if (categoria is null) faltantes.Add("Categoría");
        if (texto is null) faltantes.Add("Texto de la nota");
        if (faltantes.Count > 0)
            throw new ValidacionException("Debe completar los campos obligatorios para registrar la nota.", faltantes);

        tipoEmpresa = ValidarTipoEmpresa(tipoEmpresa!);
        categoria = CrmCatalogos.CategoriasNota.FirstOrDefault(c => Igual(c, categoria))
            ?? throw new ReglaNegocioException($"La categoría de la nota no es válida. Use una de estas: {string.Join(", ", CrmCatalogos.CategoriasNota)}.");
        visibilidad = CrmCatalogos.VisibilidadesNota.FirstOrDefault(v => Igual(v, visibilidad))
            ?? throw new ReglaNegocioException("La visibilidad de la nota debe ser Privada, Equipo o General.");
        if (texto!.Length > MaxTextoNota)
            throw new ReglaNegocioException($"El texto de la nota no puede superar los {MaxTextoNota} caracteres.");

        var idEmpresa = dto.IdEmpresa!.Value;
        var empresa = await ObtenerEmpresaRegistrableAsync(tipoEmpresa, idEmpresa, "notas");

        var registrada = await da.RegistrarNotaAsync(tipoEmpresa, idEmpresa, idUsuario, categoria, texto, visibilidad);

        await auditoria.RegistrarAsync(idUsuario, ModuloAuditoria, "NotaCRM", registrada.IdNota, "NOTA_REGISTRADA",
            $"{registrada.Codigo}: nota {categoria} ({visibilidad}) en {empresa.Empresa} ({tipoEmpresa})");
        return registrada;
    }

    // ---------- Cotizaciones de la empresa (selector de la interacción) ----------
    public async Task<List<CrmCotizacionEmpresaDto>> ListarCotizacionesAsync(string? tipoEmpresa, int? idEmpresa)
    {
        var tipo = Normalizar(tipoEmpresa);
        if (tipo is null || idEmpresa is null or <= 0)
            throw new ValidacionException("Debe seleccionar la empresa.", new List<string> { "Empresa" });
        tipo = ValidarTipoEmpresa(tipo);
        if (await catalogos.ObtenerEmpresaAsync(tipo, idEmpresa.Value) is null)
            throw new ReglaNegocioException("La empresa indicada no existe.");
        return await da.ListarCotizacionesAsync(tipo, idEmpresa.Value);
    }

    // ---------- CRMGPSC-014: historial comercial ----------
    public async Task<HistorialComercialDto> ObtenerHistorialAsync(string? tipoEmpresa, int? idEmpresa, string? tipoMovimiento,
        DateTime? desde, DateTime? hasta, int? idAutor, int idUsuario)
    {
        var tipo = Normalizar(tipoEmpresa);
        if (tipo is null || idEmpresa is null or <= 0)
            throw new ValidacionException("Debe seleccionar la empresa para consultar el historial.", new List<string> { "Empresa" });
        tipo = ValidarTipoEmpresa(tipo);

        string? movimiento = null;
        var texto = Normalizar(tipoMovimiento);
        if (texto is not null)
        {
            movimiento = TiposMovimiento.Concat(CrmCatalogos.TiposInteraccion)
                .FirstOrDefault(t => Igual(t, texto))
                ?? throw new ReglaNegocioException("El tipo de movimiento indicado no es válido.");
        }

        if (desde is not null && hasta is not null && desde.Value.Date > hasta.Value.Date)
            throw new ReglaNegocioException(MensajeRangoInvalido);

        var empresa = await catalogos.ObtenerEmpresaAsync(tipo, idEmpresa.Value)
            ?? throw new ReglaNegocioException("La empresa indicada no existe.");

        var historial = await da.ListarHistorialAsync(tipo, idEmpresa.Value, idUsuario, movimiento, desde, hasta, idAutor);
        historial.Empresa = empresa.Empresa;
        historial.Estado = empresa.Estado;
        historial.Activa = empresa.Activa;
        return historial;
    }

    // ---------- Utilidades ----------
    // Compara sin distinguir mayúsculas ni tildes ("reunion" = "Reunión"); se devuelve siempre el valor canónico del catálogo.
    private static bool Igual(string a, string? b) =>
        b is not null && string.Compare(a, b, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.CompareOptions.IgnoreCase | System.Globalization.CompareOptions.IgnoreNonSpace) == 0;

    private static string? Normalizar(string? valor) => string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();

    private static string ValidarTipoEmpresa(string tipo) =>
        CrmCatalogos.TiposEmpresa.FirstOrDefault(t => Igual(t, tipo))
        ?? throw new ReglaNegocioException("El tipo de empresa debe ser Prospecto o Cliente.");

    /// <summary>La empresa debe existir y poder recibir registros: prospecto en curso o cliente activo.</summary>
    private async Task<CrmEmpresaBasicaDto> ObtenerEmpresaRegistrableAsync(string tipoEmpresa, int idEmpresa, string objeto)
    {
        var empresa = await catalogos.ObtenerEmpresaAsync(tipoEmpresa, idEmpresa)
            ?? throw new ReglaNegocioException("La empresa indicada no existe.");

        if (tipoEmpresa == CrmCatalogos.TipoProspecto && empresa.Estado == "Descartado")
            throw new ReglaNegocioException($"No se pueden registrar {objeto} en un prospecto descartado; reactívelo primero.");
        if (tipoEmpresa == CrmCatalogos.TipoProspecto && empresa.Estado == "Convertido")
            throw new ReglaNegocioException($"No se pueden registrar {objeto} en un prospecto convertido; regístrela en el cliente.");
        if (!empresa.Activa)
            throw new ReglaNegocioException(tipoEmpresa == CrmCatalogos.TipoCliente
                ? "El cliente está inactivo."
                : $"No se pueden registrar {objeto} en esta empresa porque no está activa.");

        return empresa;
    }

    private static readonly TimeZoneInfo ZonaCostaRica = ObtenerZonaCostaRica();

    private static TimeZoneInfo ObtenerZonaCostaRica()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Central America Standard Time"); }
        catch (TimeZoneNotFoundException) { return TimeZoneInfo.FindSystemTimeZoneById("America/Costa_Rica"); }
    }

    // "Ahora" en hora de pared de Costa Rica (sin zona), redondeado hacia abajo al segundo.
    private static DateTime AhoraCostaRica()
    {
        var ahora = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, ZonaCostaRica);
        return new DateTime(ahora.Year, ahora.Month, ahora.Day, ahora.Hour, ahora.Minute, ahora.Second);
    }
}
