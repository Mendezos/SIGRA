using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

public interface IFacturaFlujo
{
    Task<FacturaDto> RegistrarAsync(RegistrarFacturaDto dto, int idUsuario);
    Task<List<FacturaDto>> ListarAsync();
    Task<FacturaDto> CambiarEstadoCobroAsync(int idFactura, CambiarEstadoCobroDto dto, int idUsuario);
}
