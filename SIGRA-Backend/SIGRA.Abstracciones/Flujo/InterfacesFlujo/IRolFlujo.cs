using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Modelos;

namespace SIGRA.Abstracciones.Flujo;

public interface IRolFlujo
{
    Task<RolModel> CrearAsync(string nombre, string? descripcion, int idUsuarioAdministrador);
    Task<List<RolModel>> ListarAsync();
    Task<RolModel> EditarAsync(int idRol, string nombre, string? descripcion, int idUsuarioAdministrador);
    Task<RolModel> CambiarEstadoAsync(int idRol, bool activo, int idUsuarioAdministrador);
    Task<List<PermisoModuloDto>> DefinirPermisosAsync(int idRol, List<PermisoModuloDto> permisos, int idUsuarioAdministrador);
    Task<List<PermisoModuloDto>> ObtenerPermisosAsync(int idRol);
}

public interface IModuloFlujo
{
    Task<List<ModuloDto>> ListarAsync();
}
