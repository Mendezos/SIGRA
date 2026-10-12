using Dapper;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using System.Data;

namespace SIGRA.DA.Repositorios;

public class RolPermisoDA : IRolPermisoDA
{
    private readonly IConexionFactory _conexionFactory;

    public RolPermisoDA(IConexionFactory conexionFactory) => _conexionFactory = conexionFactory;

    public async Task<List<PermisoModuloDto>> ObtenerPorRolAsync(int idRol)
    {
        using var conexion = _conexionFactory.CrearConexion();
        var resultado = await conexion.QueryAsync<PermisoModuloDto>(
            "sp_RolPermiso_ObtenerPorRol", new { IdRol = idRol }, commandType: CommandType.StoredProcedure);
        return resultado.ToList();
    }

    public async Task DefinirAsync(int idRol, int idModulo, bool lectura, bool escritura, bool edicion, bool eliminacion)
    {
        using var conexion = _conexionFactory.CrearConexion();
        await conexion.ExecuteAsync(
            "sp_RolPermiso_Definir",
            new { IdRol = idRol, IdModulo = idModulo, Lectura = lectura, Escritura = escritura, Edicion = edicion, Eliminacion = eliminacion },
            commandType: CommandType.StoredProcedure);
    }
}
