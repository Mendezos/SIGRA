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
}
