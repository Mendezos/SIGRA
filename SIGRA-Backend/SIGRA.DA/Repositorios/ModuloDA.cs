using Dapper;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using System.Data;

namespace SIGRA.DA.Repositorios;

public class ModuloDA : IModuloDA
{
    private readonly IConexionFactory _conexionFactory;

    public ModuloDA(IConexionFactory conexionFactory) => _conexionFactory = conexionFactory;

    public async Task<List<ModuloDto>> ListarAsync()
    {
        using var conexion = _conexionFactory.CrearConexion();
        var resultado = await conexion.QueryAsync<ModuloDto>(
            "sp_Modulo_Listar", commandType: CommandType.StoredProcedure);
        return resultado.ToList();
    }
}
