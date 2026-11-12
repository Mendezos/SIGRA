using Dapper;
using Microsoft.Data.SqlClient;
using System.Data;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.DA.Repositorios;

// CRMGPSC-015 a 018 y 024: seguimientos, agenda y contactos periódicos
public class CrmSeguimientosDA(IConexionFactory factory) : ICrmSeguimientosDA
{
    // Los SP lanzan THROW 50001 cuando una regla de negocio falla (por ejemplo, el contacto está inactivo).
    private const int CodigoReglaNegocio = 50001;

    // Un seguimiento Pendiente cuya hora ya pasó se marca Atrasado cada vez que se consulta (idempotente).
    private static Task MarcarAtrasadosAsync(IDbConnection c) =>
        c.ExecuteAsync("sp_CrmSeguimiento_MarcarAtrasados", commandType: CommandType.StoredProcedure);

    private async Task<T> EjecutarAsync<T>(Func<IDbConnection, Task<T>> accion)
    {
        using var c = factory.CrearConexion();
        try
        {
            return await accion(c);
        }
        catch (SqlException ex) when (ex.Number == CodigoReglaNegocio)
        {
            throw new ReglaNegocioException(ex.Message);
        }
    }

    public Task<List<CrmSeguimientoDto>> ListarAsync(CrmSeguimientoFiltro filtro) => EjecutarAsync(async c =>
    {
        await MarcarAtrasadosAsync(c);
        var filas = await c.QueryAsync<CrmSeguimientoDto>("sp_CrmSeguimiento_Listar", new
        {
            IdResponsable = filtro.IdResponsable,
            Desde = filtro.Desde,
            Hasta = filtro.Hasta,
            Prioridad = filtro.Prioridad,
            Tipo = filtro.Tipo,
            Estado = filtro.Estado,
            SoloAbiertos = filtro.SoloAbiertos,
            Texto = filtro.Texto
        }, commandType: CommandType.StoredProcedure);
        return filas.ToList();
    });

    public Task<CrmSeguimientoDto?> ObtenerAsync(int idSeguimiento) => EjecutarAsync<CrmSeguimientoDto?>(async c =>
    {
        await MarcarAtrasadosAsync(c);
        using var multiple = await c.QueryMultipleAsync("sp_CrmSeguimiento_Obtener", new { IdSeguimiento = idSeguimiento },
            commandType: CommandType.StoredProcedure);
        var seguimiento = await multiple.ReadFirstOrDefaultAsync<CrmSeguimientoDto>();
        if (seguimiento is not null)
            seguimiento.Historial = (await multiple.ReadAsync<CrmSeguimientoHistorialDto>()).ToList();
        return seguimiento;
    });

    public Task<int> CrearAsync(string tipoEmpresa, int idEmpresa, int? idContactoEmpresa, string tipo, DateTime fechaHora, string motivo,
        string prioridad, int idResponsable, int idUsuario) => EjecutarAsync(c =>
        c.ExecuteScalarAsync<int>("sp_CrmSeguimiento_Crear", new
        {
            TipoEmpresa = tipoEmpresa,
            IdEmpresa = idEmpresa,
            IdContactoEmpresa = idContactoEmpresa,
            Tipo = tipo,
            FechaHora = fechaHora,
            Motivo = motivo,
            Prioridad = prioridad,
            IdResponsable = idResponsable,
            IdUsuario = idUsuario
        }, commandType: CommandType.StoredProcedure));

    public Task ReprogramarAsync(int idSeguimiento, DateTime nuevaFechaHora, string motivo, int idUsuario) => EjecutarAsync(async c =>
    {
        await c.ExecuteAsync("sp_CrmSeguimiento_Reprogramar",
            new { IdSeguimiento = idSeguimiento, NuevaFechaHora = nuevaFechaHora, Motivo = motivo, IdUsuario = idUsuario },
            commandType: CommandType.StoredProcedure);
        return true;
    });

    public Task<bool> CompletarAsync(int idSeguimiento, DateTime fechaReal, string resultado, string? observaciones, string? proximoPaso, int idUsuario) =>
        EjecutarAsync(c => c.ExecuteScalarAsync<bool>("sp_CrmSeguimiento_Completar", new
        {
            IdSeguimiento = idSeguimiento,
            FechaReal = fechaReal,
            Resultado = resultado,
            Observaciones = observaciones,
            ProximoPaso = proximoPaso,
            IdUsuario = idUsuario
        }, commandType: CommandType.StoredProcedure));

    public Task<bool> CancelarAsync(int idSeguimiento, string motivo, int idUsuario) =>
        EjecutarAsync(c => c.ExecuteScalarAsync<bool>("sp_CrmSeguimiento_Cancelar",
            new { IdSeguimiento = idSeguimiento, Motivo = motivo, IdUsuario = idUsuario }, commandType: CommandType.StoredProcedure));

    // ---------- Contactos periódicos ----------
    public Task<List<CrmSerieDto>> ListarSeriesAsync(int? idResponsable, string? estado, string? texto) => EjecutarAsync(async c =>
    {
        await MarcarAtrasadosAsync(c);
        var filas = await c.QueryAsync<CrmSerieDto>("sp_CrmSerie_Listar",
            new { IdResponsable = idResponsable, Estado = estado, Texto = texto }, commandType: CommandType.StoredProcedure);
        return filas.ToList();
    });

    public Task<CrmSerieDetalleDto?> ObtenerSerieAsync(int idSerie) => EjecutarAsync<CrmSerieDetalleDto?>(async c =>
    {
        await MarcarAtrasadosAsync(c);
        using var multiple = await c.QueryMultipleAsync("sp_CrmSerie_Obtener", new { IdSerie = idSerie }, commandType: CommandType.StoredProcedure);
        var serie = await multiple.ReadFirstOrDefaultAsync<CrmSerieDetalleDto>();
        if (serie is not null)
            serie.Seguimientos = (await multiple.ReadAsync<CrmSeguimientoDto>()).ToList();
        return serie;
    });

    public Task<int> CrearSerieAsync(string tipoEmpresa, int idEmpresa, int? idContactoEmpresa, string periodicidad, DateTime fechaInicial,
        TimeSpan hora, string tipo, string motivo, string prioridad, int idResponsable, int idUsuario) => EjecutarAsync(c =>
        c.ExecuteScalarAsync<int>("sp_CrmSerie_Crear", new
        {
            TipoEmpresa = tipoEmpresa,
            IdEmpresa = idEmpresa,
            IdContactoEmpresa = idContactoEmpresa,
            Periodicidad = periodicidad,
            FechaInicial = fechaInicial.Date,
            Hora = hora,
            Tipo = tipo,
            Motivo = motivo,
            Prioridad = prioridad,
            IdResponsable = idResponsable,
            IdUsuario = idUsuario
        }, commandType: CommandType.StoredProcedure));

    public Task<(bool Aplicado, int SeguimientosCancelados)> CancelarSerieAsync(int idSerie, string motivo, int idUsuario) => EjecutarAsync(async c =>
    {
        var fila = await c.QuerySingleAsync<ResultadoCancelacionSerie>("sp_CrmSerie_Cancelar",
            new { IdSerie = idSerie, Motivo = motivo, IdUsuario = idUsuario }, commandType: CommandType.StoredProcedure);
        return (fila.Aplicado, fila.SeguimientosCancelados);
    });

    private class ResultadoCancelacionSerie
    {
        public bool Aplicado { get; set; }
        public int SeguimientosCancelados { get; set; }
    }
}
