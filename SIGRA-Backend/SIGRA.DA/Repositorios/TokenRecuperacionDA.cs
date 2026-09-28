using Dapper;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Modelos;
using System.Data;

namespace SIGRA.DA.Repositorios;

public class TokenRecuperacionDA : ITokenRecuperacionDA
{
    private readonly IConexionFactory _conexionFactory;

    public TokenRecuperacionDA(IConexionFactory conexionFactory) => _conexionFactory = conexionFactory;

    public async Task CrearAsync(int idUsuario, string token, DateTime expira)
    {
        using var conexion = _conexionFactory.CrearConexion();
        await conexion.ExecuteAsync(
            "sp_TokenRecuperacion_Crear",
            new { IdUsuario = idUsuario, Token = token, Expira = expira },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<TokenRecuperacionModel?> ObtenerValidoAsync(string token)
    {
        using var conexion = _conexionFactory.CrearConexion();
        return await conexion.QuerySingleOrDefaultAsync<TokenRecuperacionModel>(
            "sp_TokenRecuperacion_ObtenerValido", new { Token = token }, commandType: CommandType.StoredProcedure);
    }

    public async Task MarcarUsadoAsync(int idToken)
    {
        using var conexion = _conexionFactory.CrearConexion();
        await conexion.ExecuteAsync(
            "sp_TokenRecuperacion_MarcarUsado", new { IdToken = idToken }, commandType: CommandType.StoredProcedure);
    }
}
