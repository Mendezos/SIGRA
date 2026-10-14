using Dapper;
using Microsoft.Data.SqlClient;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using System.Data;

namespace SIGRA.DA.Repositorios;

public class FrecuenciaDA : IFrecuenciaDA
{
    // Los SP lanzan THROW 50001 cuando una regla de negocio falla (por ejemplo, solicitud duplicada).
    private const int CodigoReglaNegocio = 50001;

    private readonly IConexionFactory _conexionFactory;

    public FrecuenciaDA(IConexionFactory conexionFactory) => _conexionFactory = conexionFactory;

    private async Task<List<T>> ConsultarAsync<T>(string sp, object? parametros = null)
    {
        using var conexion = _conexionFactory.CrearConexion();
        var filas = await conexion.QueryAsync<T>(sp, parametros, commandType: CommandType.StoredProcedure);
        return filas.ToList();
    }

    private async Task<T> EscalarAsync<T>(string sp, object? parametros = null)
    {
        using var conexion = _conexionFactory.CrearConexion();
        try
        {
            return await conexion.ExecuteScalarAsync<T>(sp, parametros, commandType: CommandType.StoredProcedure) ?? default!;
        }
        catch (SqlException ex) when (ex.Number == CodigoReglaNegocio)
        {
            throw new ReglaNegocioException(ex.Message);
        }
    }

    public Task<List<ClienteDto>> ListarClientesAsync() => ConsultarAsync<ClienteDto>("sp_Cliente_Listar");

    public Task<List<VendedorDto>> ListarVendedoresAsync() => ConsultarAsync<VendedorDto>("sp_Vendedor_Listar");

    public Task<List<RepetidoraClienteDto>> ListarRepetidorasDeClienteAsync(int idCliente) =>
        ConsultarAsync<RepetidoraClienteDto>("sp_Frecuencia_RepetidorasCliente", new { IdCliente = idCliente });

    public Task<int> InsertarSolicitudAsync(int idCliente, int idEquipo, int idVendedor, string frecuencia, string banda,
        string potencia, string zonaCobertura, DateTime fechaPresentacion, int? idSolicitudOrigen) =>
        EscalarAsync<int>("sp_Solicitud_Insertar", new
        {
            IdCliente = idCliente,
            IdEquipo = idEquipo,
            IdVendedor = idVendedor,
            Frecuencia = frecuencia,
            Banda = banda,
            Potencia = potencia,
            ZonaCobertura = zonaCobertura,
            FechaPresentacion = fechaPresentacion.Date,
            IdSolicitudOrigen = idSolicitudOrigen
        });

    public Task<List<SolicitudFrecuenciaDto>> ListarSolicitudesAsync(string? texto, string? estado, string? cliente, string? zona, int? idVendedor) =>
        ConsultarAsync<SolicitudFrecuenciaDto>("sp_Solicitud_Listar", new { Texto = texto, Estado = estado, Cliente = cliente, Zona = zona, IdVendedor = idVendedor });

    public async Task<SolicitudFrecuenciaDto?> ObtenerSolicitudAsync(int idSolicitud) =>
        (await ConsultarAsync<SolicitudFrecuenciaDto>("sp_Solicitud_Listar", new { IdSolicitud = idSolicitud })).FirstOrDefault();

    public async Task CancelarSolicitudAsync(int idSolicitud, string motivo, int idUsuario) =>
        await EscalarAsync<int>("sp_Solicitud_Cancelar", new { IdSolicitud = idSolicitud, Motivo = motivo, IdUsuario = idUsuario });

    public Task<List<EventoAuditoriaDto>> ListarAuditoriaAsync(int idSolicitud) =>
        ConsultarAsync<EventoAuditoriaDto>("sp_Frecuencia_Auditoria", new { IdSolicitud = idSolicitud });

    public Task<List<CicloFrecuenciaDto>> ListarHistorialAsync(int idSolicitud) =>
        ConsultarAsync<CicloFrecuenciaDto>("sp_Solicitud_Historial", new { IdSolicitud = idSolicitud });

    public async Task OtorgarSolicitudAsync(int idSolicitud, DateTime fechaOtorgamiento, string numeroResolucion) =>
        await EscalarAsync<int>("sp_Solicitud_Otorgar", new
        {
            IdSolicitud = idSolicitud,
            FechaOtorgamiento = fechaOtorgamiento.Date,
            NumeroResolucion = numeroResolucion
        });

    public async Task<(List<int> Alertas, List<int> Vencidas)> EvaluarAlertasAsync(DateTime hoy)
    {
        using var conexion = _conexionFactory.CrearConexion();
        using var multiple = await conexion.QueryMultipleAsync("sp_Frecuencia_EvaluarAlertas", new { Hoy = hoy.Date }, commandType: CommandType.StoredProcedure);
        var alertas = (await multiple.ReadAsync<int>()).ToList();
        var vencidas = (await multiple.ReadAsync<int>()).ToList();
        return (alertas, vencidas);
    }

    public Task<List<AlertaFrecuenciaDto>> ListarAlertasAsync(int? idAlerta, int? idVendedor, bool? atendida) =>
        ConsultarAsync<AlertaFrecuenciaDto>("sp_Alerta_Listar", new { IdAlerta = idAlerta, IdVendedor = idVendedor, Atendida = atendida });

    public Task<List<AlertaPorEnviarDto>> ListarAlertasPorEnviarAsync(int maxIntentos) =>
        ConsultarAsync<AlertaPorEnviarDto>("sp_Alerta_PorEnviar", new { MaxIntentos = maxIntentos });

    public async Task MarcarEnvioAlertaAsync(int idAlerta, bool enviado, string? error)
    {
        using var conexion = _conexionFactory.CrearConexion();
        await conexion.ExecuteAsync("sp_Alerta_MarcarEnvio", new { IdAlerta = idAlerta, Enviado = enviado, Error = error }, commandType: CommandType.StoredProcedure);
    }

    public async Task AtenderAlertaAsync(int idAlerta, string nota, int idUsuario)
    {
        using var conexion = _conexionFactory.CrearConexion();
        try
        {
            await conexion.ExecuteAsync("sp_Alerta_Atender", new { IdAlerta = idAlerta, Nota = nota, IdUsuario = idUsuario }, commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex) when (ex.Number == CodigoReglaNegocio)
        {
            throw new ReglaNegocioException(ex.Message);
        }
    }

    public async Task<ResumenFrecuenciasDto> ObtenerResumenAsync()
    {
        using var conexion = _conexionFactory.CrearConexion();
        using var multiple = await conexion.QueryMultipleAsync("sp_Frecuencia_ResumenDashboard", commandType: CommandType.StoredProcedure);
        var resumen = await multiple.ReadFirstAsync<ResumenFrecuenciasDto>();
        resumen.FrecuenciasUrgentes = (await multiple.ReadAsync<FrecuenciaUrgenteDto>()).ToList();
        return resumen;
    }

    public Task<List<DocumentoSolicitudDto>> ListarDocumentosAsync(int idSolicitud) =>
        ConsultarAsync<DocumentoSolicitudDto>("sp_SolicitudDocumento_Listar", new { IdSolicitud = idSolicitud });

    public async Task<DocumentoSolicitudArchivoDto?> ObtenerDocumentoAsync(int idDocumento) =>
        (await ConsultarAsync<DocumentoSolicitudArchivoDto>("sp_SolicitudDocumento_Obtener", new { IdDocumento = idDocumento })).FirstOrDefault();

    public Task<int> InsertarDocumentoAsync(int idSolicitud, string tipoDocumento, string nombreDocumento, string nombreArchivo,
        string tipoContenido, byte[] contenido, int idUsuario) =>
        EscalarAsync<int>("sp_SolicitudDocumento_Insertar", new
        {
            IdSolicitud = idSolicitud,
            TipoDocumento = tipoDocumento,
            NombreDocumento = nombreDocumento,
            NombreArchivo = nombreArchivo,
            TipoContenido = tipoContenido,
            TamanoBytes = contenido.Length,
            Contenido = contenido,
            IdUsuario = idUsuario
        });
}
