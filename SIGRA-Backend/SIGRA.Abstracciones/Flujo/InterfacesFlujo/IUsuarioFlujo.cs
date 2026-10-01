using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

public interface IUsuarioFlujo
{
    Task<List<UsuarioDto>> ListarAsync();
    Task<List<RolDto>> ListarRolesAsignablesAsync(bool esAdministrador);
    Task<UsuarioDto> CrearAsync(CrearUsuarioDto dto, int idUsuarioCreador, bool esAdministrador);
    Task CambiarPasswordAsync(int idUsuario, string passwordNueva, int idUsuarioAdministrador);
}
