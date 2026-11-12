using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface IFacturaDA
{
    Task<FacturaDto> RegistrarAsync(FacturaDto factura);
    Task<List<FacturaDto>> ListarAsync();
    Task<FacturaDto?> CambiarEstadoCobroAsync(int idFactura, string estadoCobro);
    Task GuardarDetalleCobroAsync(int idFactura, CambiarEstadoCobroDto dto, int idUsuario);
}
