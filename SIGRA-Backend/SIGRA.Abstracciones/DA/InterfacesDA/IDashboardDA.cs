using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface IDashboardDA
{
    Task<DashboardInventarioDto> ObtenerInventarioAsync(int? idCategoria, int? idModelo, DateTime? desde, DateTime? hasta);
    Task<DashboardTallerDto> ObtenerTallerAsync(int? idTecnico, string? tipoServicio, DateTime? desde, DateTime? hasta);
}
