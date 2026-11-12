using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface INotificacionesDA
{
    Task<List<NotificacionDto>> ListarAsync(int idUsuario);
    Task MarcarLeidaAsync(long idNotificacion, int idUsuario);
    Task<int> MarcarTodasLeidasAsync(int idUsuario);
    Task<ResumenNotificacionesDto> ObtenerResumenAsync(int idUsuario);
    /// <summary>Registra un aviso en la campana (y encola el correo si se pide). Devuelve el id creado o 0 si la clave única ya existía.</summary>
    Task<long> RegistrarAsync(int idUsuario, int idModulo, string titulo, string mensaje, string? entidad, int? idEntidad,
        string tipo, string? claveUnica, bool enviarCorreo = true);
    /// <summary>Administradores activos del sistema (destinatarios de los avisos generales).</summary>
    Task<List<AdministradorDto>> ListarAdministradoresAsync();
    Task<long> EncolarCorreoAsync(CorreoPendienteDto correo);
    Task<CorreoPendienteDto?> TomarCorreoAsync(long? idCorreo = null);
    Task FinalizarCorreoAsync(long idCorreo, bool enviado, string? error);
}
