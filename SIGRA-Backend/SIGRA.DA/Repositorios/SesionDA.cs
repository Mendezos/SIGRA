using Dapper;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Modelos;
using System.Data;

namespace SIGRA.DA.Repositorios;

public class SesionDA : ISesionDA
{
    private readonly IConexionFactory _conexionFactory;

    public SesionDA(IConexionFactory conexionFactory) => _conexionFactory = conexionFactory;

    public async Task CrearAsync(int idUsuario, string tokenId, DateTime fechaExpiracion)
    {
        using var conexion = _conexionFactory.CrearConexion();
        await conexion.ExecuteAsync(
            "sp_Sesion_Crear",
            new { IdUsuario = idUsuario, TokenId = tokenId, FechaExpiracion = fechaExpiracion },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<SesionModel?> ObtenerActivaAsync(string tokenId)
    {
        using var conexion = _conexionFactory.CrearConexion();
        return await conexion.QuerySingleOrDefaultAsync<SesionModel>(
            "sp_Sesion_ObtenerActiva", new { TokenId = tokenId }, commandType: CommandType.StoredProcedure);
    }

    public async Task ActualizarActividadAsync(string tokenId)
    {
        using var conexion = _conexionFactory.CrearConexion();
        await conexion.ExecuteAsync(
            "sp_Sesion_ActualizarActividad", new { TokenId = tokenId }, commandType: CommandType.StoredProcedure);
    }

    public async Task CerrarAsync(string tokenId)
    {
        using var conexion = _conexionFactory.CrearConexion();
        await conexion.ExecuteAsync(
            "sp_Sesion_Cerrar", new { TokenId = tokenId }, commandType: CommandType.StoredProcedure);
    }

    public async Task CerrarTodasDelUsuarioAsync(int idUsuario)
    {
        using var conexion = _conexionFactory.CrearConexion();
        await conexion.ExecuteAsync(
            "sp_Sesion_CerrarTodasDelUsuario", new { IdUsuario = idUsuario }, commandType: CommandType.StoredProcedure);
    }
}
