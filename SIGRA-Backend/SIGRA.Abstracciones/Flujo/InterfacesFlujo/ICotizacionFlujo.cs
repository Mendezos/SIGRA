using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

public interface ICotizacionFlujo
{
    Task<CotizacionDto> RegistrarAsync(RegistrarCotizacionDto dto, int idUsuario);
    Task<CotizacionDto> ActualizarAsync(int idCotizacion, RegistrarCotizacionDto dto, int idUsuario);
    Task<CotizacionDto> CambiarEstadoAsync(int idCotizacion, CambiarEstadoCotizacionDto dto, int idUsuario);
    Task<CotizacionDto> DesactivarAsync(int idCotizacion, int idUsuario);
    Task<CotizacionDto?> ObtenerAsync(int idCotizacion);
    Task<List<CotizacionDto>> ListarAsync();
}
