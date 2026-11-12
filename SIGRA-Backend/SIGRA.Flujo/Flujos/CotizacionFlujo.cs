using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.Flujo.Flujos;

public class CotizacionFlujo(ICotizacionDA da) : ICotizacionFlujo
{
    private static readonly IReadOnlyDictionary<string, string[]> TransicionesPermitidas =
        new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["Borrador"] = ["Enviada", "Anulada"],
            ["Enviada"] = ["En negociación", "Anulada"],
            ["En negociación"] = ["Aprobada", "Anulada"],
            ["Aprobada"] = [],
            ["Anulada"] = [],
        };

    public async Task<CotizacionDto> RegistrarAsync(
        RegistrarCotizacionDto dto,
        int idUsuario)
    {
        var errores = new List<string>();
        var lineas = dto.Lineas ?? new List<LineaCotizacionDto>();

        if (dto.IdProspecto <= 0)
            errores.Add("Debe seleccionar un prospecto.");

        if (dto.Fecha.HasValue && dto.Fecha.Value < DateOnly.FromDateTime(DateTime.Today))
            errores.Add("La fecha de la cotización no puede ser anterior a hoy.");

        if (lineas.Count == 0)
            errores.Add("Debe agregar al menos una línea de cotización.");

        foreach (var linea in lineas)
        {
            if (linea.IdProducto <= 0)
                errores.Add("Cada línea debe tener un producto válido.");

            if (linea.Cantidad <= 0)
                errores.Add("La cantidad debe ser mayor que cero.");

            if (linea.PrecioUnitario < 0)
                errores.Add("El precio unitario no puede ser negativo.");
        }

        if (errores.Count > 0)
            throw new ValidacionException(
                "Debe completar correctamente los datos de la cotización.",
                errores);

        var monto = lineas.Sum(linea => linea.Total);
        if (monto <= 0)
            throw new ReglaNegocioException(
                "El monto total de la cotización debe ser mayor que cero.");

        var cotizacion = new CotizacionDto
        {
            IdUsuario = idUsuario,
            IdProspecto = dto.IdProspecto,
            Fecha = dto.Fecha ?? DateOnly.FromDateTime(DateTime.Today),
            Monto = monto,
            Estado = "Borrador",
            Activa = true,
            Lineas = lineas
        };

        return await da.RegistrarAsync(cotizacion);
    }

    public async Task<CotizacionDto> ActualizarAsync(
        int idCotizacion,
        RegistrarCotizacionDto dto,
        int idUsuario)
    {
        var existente = await ObtenerAsync(idCotizacion)
            ?? throw new ReglaNegocioException("La cotización no existe.");

        if (!string.Equals(existente.Estado, "Borrador", StringComparison.OrdinalIgnoreCase))
            throw new ReglaNegocioException(
                "Solo se pueden editar cotizaciones en estado Borrador.");

        var actualizada = await CrearCotizacionValidadaAsync(dto, existente);
        return await da.ActualizarAsync(actualizada)
            ?? throw new ReglaNegocioException("No se pudo actualizar la cotización.");
    }

    public Task<CotizacionDto?> ObtenerAsync(int idCotizacion)
    {
        if (idCotizacion <= 0)
            throw new ReglaNegocioException(
                "El identificador de la cotización no es válido.");

        return da.ObtenerAsync(idCotizacion);
    }

    public Task<List<CotizacionDto>> ListarAsync() => da.ListarAsync();

    public async Task<CotizacionDto> CambiarEstadoAsync(
        int idCotizacion,
        CambiarEstadoCotizacionDto dto,
        int idUsuario)
    {
        var cotizacion = await ObtenerAsync(idCotizacion)
            ?? throw new ReglaNegocioException("La cotización no existe.");
        var nuevoEstado = dto.Estado.Trim();

        if (!TransicionesPermitidas.TryGetValue(cotizacion.Estado, out var estados) ||
            !estados.Contains(nuevoEstado, StringComparer.OrdinalIgnoreCase))
        {
            throw new ReglaNegocioException(
                $"No se puede cambiar una cotización de {cotizacion.Estado} a {nuevoEstado}.");
        }

        return await da.CambiarEstadoAsync(idCotizacion, nuevoEstado)
            ?? throw new ReglaNegocioException("No se pudo cambiar el estado de la cotización.");
    }

    public async Task<CotizacionDto> DesactivarAsync(int idCotizacion, int idUsuario)
    {
        var cotizacion = await ObtenerAsync(idCotizacion)
            ?? throw new ReglaNegocioException("La cotización no existe.");

        if (!string.Equals(cotizacion.Estado, "Anulada", StringComparison.OrdinalIgnoreCase))
            throw new ReglaNegocioException(
                "Solo se pueden desactivar cotizaciones anuladas.");

        if (!cotizacion.Activa)
            throw new ReglaNegocioException("La cotización ya está desactivada.");

        return await da.CambiarActivaAsync(idCotizacion, false)
            ?? throw new ReglaNegocioException("No se pudo desactivar la cotización.");
    }

    private static Task<CotizacionDto> CrearCotizacionValidadaAsync(
        RegistrarCotizacionDto dto,
        CotizacionDto? existente = null)
    {
        var errores = new List<string>();
        var lineas = dto.Lineas ?? new List<LineaCotizacionDto>();

        if (dto.IdProspecto <= 0)
            errores.Add("Debe seleccionar un prospecto.");

        var fecha = dto.Fecha ?? existente?.Fecha ?? DateOnly.FromDateTime(DateTime.Today);
        if (fecha < DateOnly.FromDateTime(DateTime.Today))
            errores.Add("La fecha de la cotización no puede ser anterior a hoy.");

        if (lineas.Count == 0)
            errores.Add("Debe agregar al menos una línea de cotización.");

        foreach (var linea in lineas)
        {
            if (linea.IdProducto <= 0)
                errores.Add("Cada línea debe tener un producto válido.");
            if (linea.Cantidad <= 0)
                errores.Add("La cantidad debe ser mayor que cero.");
            if (linea.PrecioUnitario < 0)
                errores.Add("El precio unitario no puede ser negativo.");
        }

        if (errores.Count > 0)
            throw new ValidacionException(
                "Debe completar correctamente los datos de la cotización.",
                errores);

        var monto = lineas.Sum(linea => linea.Total);
        if (monto <= 0)
            throw new ReglaNegocioException(
                "El monto total de la cotización debe ser mayor que cero.");

        return Task.FromResult(new CotizacionDto
        {
            IdUsuario = existente?.IdUsuario ?? 0,
            IdCotizacion = existente?.IdCotizacion ?? 0,
            IdProspecto = dto.IdProspecto,
            Fecha = fecha,
            Monto = monto,
            Estado = existente?.Estado ?? "Borrador",
            Activa = existente?.Activa ?? true,
            Lineas = lineas
        });
    }
}
