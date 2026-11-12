using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface ICotizacionDA
{
    Task<CotizacionDto> RegistrarAsync(CotizacionDto cotizacion);
    Task<CotizacionDto?> ActualizarAsync(CotizacionDto cotizacion);
    Task<CotizacionDto?> CambiarEstadoAsync(int idCotizacion, string estado);
    Task<CotizacionDto?> CambiarActivaAsync(int idCotizacion, bool activa);
    Task<CotizacionDto?> ObtenerAsync(int idCotizacion);
    Task<List<CotizacionDto>> ListarAsync();
}
