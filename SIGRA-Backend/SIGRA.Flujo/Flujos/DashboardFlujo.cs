using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.Flujo.Flujos;

// DAR-001 a 004 y 008: indicadores del inventario
public class DashboardFlujo(IDashboardDA da) : IDashboardFlujo
{
    public Task<DashboardInventarioDto> ObtenerInventarioAsync(int? idCategoria, int? idModelo, DateTime? desde, DateTime? hasta)
    {
        if (desde is not null && hasta is not null && desde.Value.Date > hasta.Value.Date)
            throw new ReglaNegocioException("La fecha inicial no puede ser posterior a la final. Corrija el rango de fechas.");
        return da.ObtenerInventarioAsync(idCategoria, idModelo, desde?.Date, hasta?.Date);
    }

    // DAR-013, 014, 016, 017, 020, 021 y 022
    public Task<DashboardTallerDto> ObtenerTallerAsync(int? idTecnico, string? tipoServicio, DateTime? desde, DateTime? hasta)
    {
        if (desde is not null && hasta is not null && desde.Value.Date > hasta.Value.Date)
            throw new ReglaNegocioException("El rango de fechas ingresado no es válido.");
        return da.ObtenerTallerAsync(idTecnico, string.IsNullOrWhiteSpace(tipoServicio) ? null : tipoServicio.Trim(), desde?.Date, hasta?.Date);
    }
}
