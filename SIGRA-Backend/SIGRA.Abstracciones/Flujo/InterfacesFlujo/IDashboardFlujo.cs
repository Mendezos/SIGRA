using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

public interface IDashboardFlujo
{
    Task<DashboardInventarioDto> ObtenerInventarioAsync(int? idCategoria, int? idModelo, DateTime? desde, DateTime? hasta);
    Task<DashboardTallerDto> ObtenerTallerAsync(int? idTecnico, string? tipoServicio, DateTime? desde, DateTime? hasta);
}
