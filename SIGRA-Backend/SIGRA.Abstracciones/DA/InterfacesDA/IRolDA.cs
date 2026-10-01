using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Modelos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface IRolDA
{
    Task<bool> ExisteConNombreAsync(string nombre);
    Task<RolModel> CrearAsync(string nombre, string? descripcion);
    Task<List<RolModel>> ListarAsync();
    Task<RolModel?> ObtenerPorIdAsync(int idRol);
    Task<bool> ExisteConNombreExcluyendoAsync(string nombre, int idRolExcluir);
    Task<RolModel> EditarAsync(int idRol, string nombre, string? descripcion);
    Task<RolModel> CambiarEstadoAsync(int idRol, bool activo);
}

public interface IModuloDA
{
    Task<List<ModuloDto>> ListarAsync();
}
