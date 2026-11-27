using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface IAlertasDA
{
    Task<ListadoAlertasDto> ListarAsync();
    Task AtenderAsync(string clave, int idModulo, string titulo, string nota, int idUsuario);
    Task<List<VistaFavoritaDto>> ListarVistasAsync(int idUsuario);
    Task GuardarVistaAsync(int idUsuario, string nombre, string filtros);
    Task EliminarVistaAsync(int idUsuario, int idVista);
}
