using Dapper;
using System.Data;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.DA.Repositorios;

public class NotificacionesDA(IConexionFactory factory) : INotificacionesDA
{
    public async Task<List<NotificacionDto>> ListarAsync(int idUsuario)
    {
        using var c = factory.CrearConexion();
        return (await c.QueryAsync<NotificacionDto>("sp_Notificacion_Consultar", new { IdUsuario = idUsuario }, commandType: CommandType.StoredProcedure)).ToList();
    }
    public async Task MarcarLeidaAsync(long idNotificacion, int idUsuario)
    {
        using var c = factory.CrearConexion();
        try { await c.ExecuteAsync("sp_Notificacion_Leer", new { IdNotificacion = idNotificacion, IdUsuario = idUsuario }, commandType: CommandType.StoredProcedure); }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number == 50001) { throw new ReglaNegocioException(ex.Message); }
    }
    public async Task<long> EncolarCorreoAsync(CorreoPendienteDto correo)
    {
        using var c = factory.CrearConexion();
        return await c.ExecuteScalarAsync<long>("sp_Correo_Encolar", new { correo.Destinatario, correo.Nombre, correo.Asunto, correo.Cuerpo, correo.AdjuntosJson }, commandType: CommandType.StoredProcedure);
    }
    public async Task<CorreoPendienteDto?> TomarCorreoAsync(long? idCorreo = null)
    {
        using var c = factory.CrearConexion();
        return await c.QuerySingleOrDefaultAsync<CorreoPendienteDto>("sp_Correo_Tomar", new { IdCorreo = idCorreo }, commandType: CommandType.StoredProcedure);
    }
    public async Task FinalizarCorreoAsync(long idCorreo, bool enviado, string? error)
    {
        using var c = factory.CrearConexion();
        await c.ExecuteAsync("sp_Correo_Finalizar", new { IdCorreo = idCorreo, Enviado = enviado, Error = error }, commandType: CommandType.StoredProcedure);
    }
}
