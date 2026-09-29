using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Modelos;

namespace SIGRA.Abstracciones.Flujo;

public interface IRolFlujo
{
    Task<RolModel> CrearAsync(string nombre, int idUsuarioAdministrador);
    Task<List<RolModel>> ListarAsync();
    Task<RolModel> EditarAsync(int idRol, string nombre, int idUsuarioAdministrador);
    Task<RolModel> CambiarEstadoAsync(int idRol, bool activo, int idUsuarioAdministrador);
    Task<List<PermisoModuloDto>> DefinirPermisosAsync(int idRol, List<PermisoModuloDto> permisos, int idUsuarioAdministrador);
}
