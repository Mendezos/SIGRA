using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface IEncuestaDA
{
    Task<(EncuestaSatisfaccionDto Encuesta, string Token)> CrearAsync(
        FacturaDto factura,
        string correoCliente);
    Task<List<EncuestaSatisfaccionDto>> ListarAsync();
    Task<EncuestaSatisfaccionDto?> ObtenerPorIdAsync(int idEncuesta);
    Task<EncuestaSatisfaccionDto?> ObtenerPublicaAsync(string hashToken);
    Task<RespuestaEncuestaResultadoDto> ResponderAsync(
        string hashToken,
        ResponderEncuestaDto dto,
        int umbralBajaSatisfaccion);
    Task<(EncuestaSatisfaccionDto Encuesta, string Token)?> ReenviarAsync(int idEncuesta);
    Task<HistorialClienteFinancieroDto> ObtenerHistorialClienteAsync(int idCliente);
}
