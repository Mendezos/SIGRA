using Dapper;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Modelos;
using System.Data;

namespace SIGRA.DA.Repositorios;

public class RolDA : IRolDA
{
    private readonly IConexionFactory _conexionFactory;

    public RolDA(IConexionFactory conexionFactory) => _conexionFactory = conexionFactory;

    public async Task<bool> ExisteConNombreAsync(string nombre)
    {
        using var conexion = _conexionFactory.CrearConexion();
        return await conexion.ExecuteScalarAsync<bool>(
            "sp_Rol_ExisteConNombre", new { Nombre = nombre }, commandType: CommandType.StoredProcedure);
    }

    public async Task<RolModel> CrearAsync(string nombre)
    {
        using var conexion = _conexionFactory.CrearConexion();
        var resultado = await conexion.QuerySingleAsync<RolModel>(
            "sp_Rol_Insertar", new { Nombre = nombre }, commandType: CommandType.StoredProcedure);
        return resultado;
    }

    public async Task<List<RolModel>> ListarAsync()
    {
        using var conexion = _conexionFactory.CrearConexion();
        var resultado = await conexion.QueryAsync<RolModel>(
            "sp_Rol_Listar", commandType: CommandType.StoredProcedure);
        return resultado.ToList();
    }

    public async Task<RolModel?> ObtenerPorIdAsync(int idRol)
    {
        using var conexion = _conexionFactory.CrearConexion();
        return await conexion.QuerySingleOrDefaultAsync<RolModel>(
            "sp_Rol_ObtenerPorId", new { IdRol = idRol }, commandType: CommandType.StoredProcedure);
    }

    public async Task<bool> ExisteConNombreExcluyendoAsync(string nombre, int idRolExcluir)
    {
        using var conexion = _conexionFactory.CrearConexion();
        return await conexion.ExecuteScalarAsync<bool>(
            "sp_Rol_ExisteConNombreExcluyendo", new { Nombre = nombre, IdRolExcluir = idRolExcluir },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<RolModel> EditarAsync(int idRol, string nombre)
    {
        using var conexion = _conexionFactory.CrearConexion();
        return await conexion.QuerySingleAsync<RolModel>(
            "sp_Rol_Editar", new { IdRol = idRol, Nombre = nombre }, commandType: CommandType.StoredProcedure);
    }

    public async Task<RolModel> CambiarEstadoAsync(int idRol, bool activo)
    {
        using var conexion = _conexionFactory.CrearConexion();
        return await conexion.QuerySingleAsync<RolModel>(
            "sp_Rol_CambiarEstado", new { IdRol = idRol, Activo = activo }, commandType: CommandType.StoredProcedure);
    }
}
