using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

public interface IEncuestaFlujo
{
    Task<EncuestaSatisfaccionDto?> CrearParaFacturaAsync(FacturaDto factura);
    Task<List<EncuestaSatisfaccionDto>> ListarAsync();
    Task<EncuestaPublicaDto> ObtenerPublicaAsync(string token);
    Task<RespuestaEncuestaResultadoDto> ResponderAsync(
        string token,
        ResponderEncuestaDto dto);
    Task<ReenvioEncuestaResultadoDto> ReenviarAsync(int idEncuesta);
    Task<HistorialClienteFinancieroDto> ObtenerHistorialClienteAsync(int idCliente);
}
