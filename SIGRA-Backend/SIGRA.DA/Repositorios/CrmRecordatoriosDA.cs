using Dapper;
using Microsoft.Data.SqlClient;
using System.Data;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.DA.Repositorios;

// CRMGPSC-025 y T-02: recordatorios de baterías y servicio de recordatorios
public class CrmRecordatoriosDA(IConexionFactory factory) : ICrmRecordatoriosDA
{
    // Los SP lanzan THROW 50001 cuando una regla de negocio falla (por ejemplo, cliente inactivo o compra duplicada).
    private const int CodigoReglaNegocio = 50001;

    public async Task<List<BateriaModeloDto>> ListarModelosAsync()
    {
        using var c = factory.CrearConexion();
        return (await c.QueryAsync<BateriaModeloDto>("sp_CrmBateria_Modelos", commandType: CommandType.StoredProcedure)).ToList();
    }

    public async Task<List<RecordatorioBateriaDto>> ListarAsync(string? estado, int? idVendedor, string? cliente, DateTime? desde, DateTime? hasta)
    {
        using var c = factory.CrearConexion();
        return (await c.QueryAsync<RecordatorioBateriaDto>("sp_CrmBateria_Listar",
            new { Estado = estado, IdVendedor = idVendedor, Cliente = cliente, Desde = desde?.Date, Hasta = hasta?.Date },
            commandType: CommandType.StoredProcedure)).ToList();
    }

    public async Task<RecordatorioBateriaDto?> ObtenerAsync(int idRecordatorio)
    {
        using var c = factory.CrearConexion();
        return await c.QueryFirstOrDefaultAsync<RecordatorioBateriaDto>("sp_CrmBateria_Obtener",
            new { IdRecordatorio = idRecordatorio }, commandType: CommandType.StoredProcedure);
    }

    public async Task<(int IdRecordatorio, List<int> Cerrados)> RegistrarAsync(int idCliente, int? idContactoEmpresa, int? idFactura, string? numeroFactura,
        int? idModelo, string? modeloBateria, int cantidad, DateTime fechaCompra, int idVendedor, int idUsuario)
    {
        using var c = factory.CrearConexion();
        try
        {
            using var multiple = await c.QueryMultipleAsync("sp_CrmBateria_Registrar", new
            {
                IdCliente = idCliente,
                IdContactoEmpresa = idContactoEmpresa,
                IdFactura = idFactura,
                NumeroFactura = numeroFactura,
                IdModelo = idModelo,
                ModeloBateria = modeloBateria,
                Cantidad = cantidad,
                FechaCompra = fechaCompra.Date,
                IdVendedor = idVendedor,
                IdUsuario = idUsuario,
                MesesAviso = CrmCatalogos.MesesRecordatorioBateria
            }, commandType: CommandType.StoredProcedure);

            var id = await multiple.ReadFirstAsync<int>();
            var cerrados = (await multiple.ReadAsync<int>()).ToList();
            return (id, cerrados);
        }
        catch (SqlException ex) when (ex.Number == CodigoReglaNegocio)
        {
            throw new ReglaNegocioException(ex.Message);
        }
    }

    public async Task<bool> AtenderAsync(int idRecordatorio, string medio, string resultado, string? observacion, string? proximoPaso, int idUsuario)
    {
        using var c = factory.CrearConexion();
        try
        {
            return await c.ExecuteScalarAsync<bool>("sp_CrmBateria_Atender", new
            {
                IdRecordatorio = idRecordatorio,
                Medio = medio,
                Resultado = resultado,
                Observacion = observacion,
                ProximoPaso = proximoPaso,
                IdUsuario = idUsuario
            }, commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex) when (ex.Number == CodigoReglaNegocio)
        {
            throw new ReglaNegocioException(ex.Message);
        }
    }

    public async Task<List<BateriaFacturaResultadoDto>> RegistrarDesdeFacturaAsync(int idFactura, int? idUsuario)
    {
        using var c = factory.CrearConexion();
        try
        {
            return (await c.QueryAsync<BateriaFacturaResultadoDto>("sp_CrmBateria_RegistrarDesdeFactura",
                new { IdFactura = idFactura, IdUsuario = idUsuario, MesesAviso = CrmCatalogos.MesesRecordatorioBateria },
                commandType: CommandType.StoredProcedure)).ToList();
        }
        catch (SqlException ex) when (ex.Number == CodigoReglaNegocio)
        {
            throw new ReglaNegocioException(ex.Message);
        }
    }

    public async Task<ResumenProcesoRecordatoriosDto> ProcesarAsync()
    {
        using var c = factory.CrearConexion();
        return await c.QueryFirstAsync<ResumenProcesoRecordatoriosDto>("sp_CrmRecordatorio_Procesar",
            commandType: CommandType.StoredProcedure, commandTimeout: 300);
    }

    public async Task<ResumenRecordatoriosDto> ObtenerResumenAsync(int idUsuario)
    {
        using var c = factory.CrearConexion();
        return await c.QueryFirstAsync<ResumenRecordatoriosDto>("sp_CrmRecordatorio_Resumen",
            new { IdUsuario = idUsuario }, commandType: CommandType.StoredProcedure);
    }
}
