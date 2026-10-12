using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface INotificacionesDA
{
    Task<List<NotificacionDto>> ListarAsync(int idUsuario);
    Task MarcarLeidaAsync(long idNotificacion, int idUsuario);
    Task<long> EncolarCorreoAsync(CorreoPendienteDto correo);
    Task<CorreoPendienteDto?> TomarCorreoAsync(long? idCorreo = null);
    Task FinalizarCorreoAsync(long idCorreo, bool enviado, string? error);
}
