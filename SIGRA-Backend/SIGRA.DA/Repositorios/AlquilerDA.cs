using Dapper;
using SIGRA.Abstracciones.Conexion;
using Microsoft.Data.SqlClient;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using System.Data;

namespace SIGRA.DA.Repositorios;

public class AlquilerDA : IAlquilerDA
{
    // Los SP lanzan THROW 50001 cuando una regla de negocio falla (por ejemplo, equipo ya no disponible).
    private const int CodigoReglaNegocio = 50001;

    private readonly IConexionFactory _conexionFactory;

    public AlquilerDA(IConexionFactory conexionFactory) => _conexionFactory = conexionFactory;

    private async Task<List<T>> ConsultarAsync<T>(string sp, object? parametros = null)
    {
        using var conexion = _conexionFactory.CrearConexion();
        var filas = await conexion.QueryAsync<T>(sp, parametros, commandType: CommandType.StoredProcedure);
        return filas.ToList();
    }

    private async Task<T?> PrimeroAsync<T>(string sp, object? parametros = null)
    {
        var filas = await ConsultarAsync<T>(sp, parametros);
        return filas.FirstOrDefault();
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

    private async Task EjecutarAsync(string sp, object parametros)
    {
        using var conexion = _conexionFactory.CrearConexion();
        try
        {
            await conexion.ExecuteAsync(sp, parametros, commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex) when (ex.Number == CodigoReglaNegocio)
        {
            throw new ReglaNegocioException(ex.Message);
        }
    }

    public Task<List<VendedorDto>> ListarVendedoresAsync() => ConsultarAsync<VendedorDto>("sp_Vendedor_Listar");

    public Task<VendedorDto?> ObtenerSiguienteVendedorCascadaAsync() => PrimeroAsync<VendedorDto>("sp_Vendedor_SiguienteCascada");

    public Task<VendedorDto?> ObtenerVendedorPrevioAsync(string empresa) =>
        PrimeroAsync<VendedorDto>("sp_Contacto_VendedorPrevio", new { Empresa = empresa });

    public Task<ContactoRecienteDto?> ObtenerContactoRecienteAsync(string empresa) =>
        PrimeroAsync<ContactoRecienteDto>("sp_Contacto_RecienteDeEmpresa", new { Empresa = empresa });

    public Task<int> InsertarContactoAsync(string empresa, string? contacto, string medio, string dato, string? motivo,
        int? idVendedor, string? motivoAsignacion, int idUsuario) =>
        EscalarAsync<int>("sp_Contacto_Insertar", new
        {
            Empresa = empresa,
            Contacto = contacto,
            MedioContacto = medio,
            DatoContacto = dato,
            Motivo = motivo,
            IdVendedor = idVendedor,
            MotivoAsignacion = motivoAsignacion,
            IdUsuario = idUsuario
        });

    public Task<List<ContactoDto>> ListarContactosAsync(int? idVendedor) =>
        ConsultarAsync<ContactoDto>("sp_Contacto_Listar", new { IdVendedor = idVendedor });

    public Task<List<ContactoHistorialDto>> ObtenerHistorialContactoAsync(int idContacto) =>
        ConsultarAsync<ContactoHistorialDto>("sp_Contacto_Historial", new { IdContacto = idContacto });

    public Task<bool> ExisteContactoAsync(int idContacto) => EscalarAsync<bool>("sp_Contacto_Existe", new { IdContacto = idContacto });

    public Task ReasignarContactoAsync(int idContacto, int idVendedor, int idUsuario, string motivo) =>
        EjecutarAsync("sp_Contacto_Reasignar", new { IdContacto = idContacto, IdVendedor = idVendedor, IdUsuario = idUsuario, Motivo = motivo });

    public Task<List<ClienteDto>> ListarClientesAsync() => ConsultarAsync<ClienteDto>("sp_Cliente_Listar");

    public Task<List<EquipoDisponibleDto>> ListarEquiposParaContratoAsync() =>
        ConsultarAsync<EquipoDisponibleDto>("sp_Equipo_ListarParaContrato");

    public Task<int> InsertarContratoAsync(string empresa, DateTime fechaInicio, DateTime fechaVencimiento, decimal montoMensual,
        string? condiciones, int? idVendedor, IEnumerable<int> idsEquipo, int idUsuario) =>
        EscalarAsync<int>("sp_Contrato_Insertar", new
        {
            Empresa = empresa,
            FechaInicio = fechaInicio,
            FechaVencimiento = fechaVencimiento,
            MontoMensual = montoMensual,
            Condiciones = condiciones,
            IdVendedor = idVendedor,
            IdsEquipo = string.Join(",", idsEquipo),
            IdUsuario = idUsuario
        });

    public Task<List<ContratoDto>> ListarContratosAsync(string? texto, string? estado) =>
        ConsultarAsync<ContratoDto>("sp_Contrato_Listar", new { Texto = texto, Estado = estado });

    public Task<ContratoDto?> ObtenerContratoAsync(int idContrato) =>
        PrimeroAsync<ContratoDto>("sp_Contrato_Obtener", new { IdContrato = idContrato });

    public Task<List<ContratoEquipoDto>> ListarEquiposDeContratoAsync(int idContrato) =>
        ConsultarAsync<ContratoEquipoDto>("sp_Contrato_Equipos", new { IdContrato = idContrato });

    public Task AgregarEquipoAContratoAsync(int idContrato, int idEquipo, DateTime fechaAsignacion, int idUsuario) =>
        EjecutarAsync("sp_Contrato_AgregarEquipo", new
        {
            IdContrato = idContrato,
            IdEquipo = idEquipo,
            FechaAsignacion = fechaAsignacion,
            IdUsuario = idUsuario
        });

    public Task<List<RadioDto>> ListarRadiosAsync(string? texto, string? numeroSerie) =>
        ConsultarAsync<RadioDto>("sp_Radio_Listar", new { Texto = texto, NumeroSerie = numeroSerie });

    public Task<bool> TieneContratoActivoAsync(int idEquipo) =>
        EscalarAsync<bool>("sp_Radio_ContratoActivo", new { IdEquipo = idEquipo });
}
