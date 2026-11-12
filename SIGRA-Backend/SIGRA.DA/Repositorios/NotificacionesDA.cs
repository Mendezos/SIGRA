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
    public async Task<int> MarcarTodasLeidasAsync(int idUsuario)
    {
        using var c = factory.CrearConexion();
        return await c.ExecuteScalarAsync<int>("sp_Notificacion_LeerTodas", new { IdUsuario = idUsuario }, commandType: CommandType.StoredProcedure);
    }
    public async Task<ResumenNotificacionesDto> ObtenerResumenAsync(int idUsuario)
    {
        using var c = factory.CrearConexion();
        return await c.QuerySingleAsync<ResumenNotificacionesDto>("sp_Notificacion_Resumen", new { IdUsuario = idUsuario }, commandType: CommandType.StoredProcedure);
    }
    public async Task<long> RegistrarAsync(int idUsuario, int idModulo, string titulo, string mensaje, string? entidad, int? idEntidad,
        string tipo, string? claveUnica, bool enviarCorreo = true)
    {
        using var c = factory.CrearConexion();
        var p = new DynamicParameters();
        p.Add("IdUsuario", idUsuario); p.Add("IdModulo", idModulo); p.Add("Titulo", titulo); p.Add("Mensaje", mensaje);
        p.Add("Entidad", entidad); p.Add("IdEntidad", idEntidad); p.Add("EnviarCorreo", enviarCorreo);
        p.Add("Tipo", tipo); p.Add("ClaveUnica", claveUnica);
        p.Add("IdNotificacion", dbType: DbType.Int64, direction: ParameterDirection.Output);
        await c.ExecuteAsync("sp_Notificacion_Registrar", p, commandType: CommandType.StoredProcedure);
        return p.Get<long>("IdNotificacion");
    }
    public async Task<List<AdministradorDto>> ListarAdministradoresAsync()
    {
        using var c = factory.CrearConexion();
        return (await c.QueryAsync<AdministradorDto>("sp_Administrador_Listar", commandType: CommandType.StoredProcedure)).ToList();
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
