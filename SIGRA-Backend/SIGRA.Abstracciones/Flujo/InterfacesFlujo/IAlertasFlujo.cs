using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

public interface IAlertasFlujo
{
    Task<ListadoAlertasDto> ListarAsync(int idUsuario);
    Task<ListadoAlertasDto> AtenderAsync(AtenderAlertaUnificadaDto dto, int idUsuario);
    Task<List<VistaFavoritaDto>> ListarVistasAsync(int idUsuario);
    Task<List<VistaFavoritaDto>> GuardarVistaAsync(GuardarVistaDto dto, int idUsuario);
    Task<List<VistaFavoritaDto>> EliminarVistaAsync(int idVista, int idUsuario);
}
