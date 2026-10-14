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
        string? condiciones, int? idVendedor, IEnumerable<int> idsEquipo, int idUsuario, IEnumerable<AccesorioContratoItemDto>? accesorios = null, bool cubreReparaciones = false) =>
        EscalarAsync<int>("sp_Contrato_Insertar", new
        {
            Empresa = empresa,
            FechaInicio = fechaInicio,
            FechaVencimiento = fechaVencimiento,
            MontoMensual = montoMensual,
            Condiciones = condiciones,
            CubreReparaciones = cubreReparaciones,
            IdVendedor = idVendedor,
            IdsEquipo = string.Join(",", idsEquipo),
            IdUsuario = idUsuario,
            AccesoriosJson = accesorios is null ? null : System.Text.Json.JsonSerializer.Serialize(accesorios, JsonCamel)
        });

    public Task<List<ContratoDto>> ListarContratosAsync(string? texto, string? estado) =>
        ConsultarAsync<ContratoDto>("sp_Contrato_Listar", new { Texto = texto, Estado = estado });

    private static readonly System.Text.Json.JsonSerializerOptions JsonCamel = new() { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase };

    public Task<List<ContratoAccesorioDto>> ListarAccesoriosDeContratoAsync(int idContrato) =>
        ConsultarAsync<ContratoAccesorioDto>("sp_Contrato_Accesorios", new { IdContrato = idContrato });

    public Task GuardarAccesoriosDeContratoAsync(int idContrato, IEnumerable<AccesorioContratoItemDto> accesorios) =>
        EjecutarAsync("sp_ContratoAccesorio_Guardar", new
        {
            IdContrato = idContrato,
            ItemsJson = System.Text.Json.JsonSerializer.Serialize(accesorios, JsonCamel)
        });

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

    public Task<List<RadioDto>> ListarRadiosAsync(string? texto, string? numeroSerie, bool soloBateriaPorCambiar = false) =>
        ConsultarAsync<RadioDto>("sp_Radio_Listar", new { Texto = texto, NumeroSerie = numeroSerie, SoloBateriaPorCambiar = soloBateriaPorCambiar });

    public Task<bool> TieneContratoActivoAsync(int idEquipo) =>
        EscalarAsync<bool>("sp_Radio_ContratoActivo", new { IdEquipo = idEquipo });

    public Task RenovarContratoAsync(int idContrato, DateTime nuevaFecha, decimal? nuevoMonto, IEnumerable<int> idsAgregar,
        IEnumerable<int> idsRetirar, string? observacion, int idUsuario) =>
        EjecutarAsync("sp_Contrato_Renovar", new
        {
            IdContrato = idContrato,
            NuevaFecha = nuevaFecha,
            NuevoMonto = nuevoMonto,
            IdsAgregar = string.Join(",", idsAgregar),
            IdsRetirar = string.Join(",", idsRetirar),
            Observacion = observacion,
            IdUsuario = idUsuario
        });

    public Task<List<RenovacionDto>> ListarRenovacionesAsync(int idContrato) =>
        ConsultarAsync<RenovacionDto>("sp_Contrato_Renovaciones", new { IdContrato = idContrato });

    public Task CancelarContratoAsync(int idContrato, string motivo, int idUsuario) =>
        EjecutarAsync("sp_Contrato_Cancelar", new { IdContrato = idContrato, Motivo = motivo, IdUsuario = idUsuario });

    public Task<List<AuditoriaContratoDto>> ListarAuditoriaContratoAsync(int idContrato) =>
        ConsultarAsync<AuditoriaContratoDto>("sp_Contrato_Auditoria", new { IdContrato = idContrato });

    public Task<int> MarcarContratosVencidosAsync() => EscalarAsync<int>("sp_Contrato_MarcarVencidos");

    public Task<List<AlertaContratoDto>> ListarAlertasPendientesAsync() =>
        ConsultarAsync<AlertaContratoDto>("sp_Contrato_AlertasPendientes");

    public Task RegistrarAlertaAsync(int idContrato, string tipo) =>
        EjecutarAsync("sp_Contrato_AlertaRegistrar", new { IdContrato = idContrato, Tipo = tipo });

    public Task<List<AdministradorDto>> ListarAdministradoresAsync() =>
        ConsultarAsync<AdministradorDto>("sp_Administrador_Listar");

    public Task<List<CambioBateriaDto>> ListarBateriasAsync(int idRadio) =>
        ConsultarAsync<CambioBateriaDto>("sp_Bateria_Historial", new { IdRadio = idRadio });

    public Task RegistrarBateriaAsync(int idRadio, string numeroSerieBateria, DateTime fechaCambio, int idUsuario) =>
        EjecutarAsync("sp_Bateria_Registrar", new
        {
            IdRadio = idRadio,
            NumeroSerieBateria = numeroSerieBateria,
            FechaCambio = fechaCambio,
            IdUsuario = idUsuario
        });

    public Task<List<RepetidoraDto>> ListarRepetidorasAsync(string? texto, bool? facturable) =>
        ConsultarAsync<RepetidoraDto>("sp_Repetidora_Listar", new { Texto = texto, Facturable = facturable });

    public Task<RepetidoraDto?> ObtenerRepetidoraPorSerieAsync(string numeroSerie) =>
        PrimeroAsync<RepetidoraDto>("sp_Repetidora_Obtener", new { NumeroSerie = numeroSerie });

    public async Task<(List<RequisitoChecklistDto> Requisitos, VerificacionChecklistDto? Ultima, List<VerificacionChecklistDto> Historial)> ObtenerChecklistAsync(int idEquipo)
    {
        using var conexion = _conexionFactory.CrearConexion();
        using var multiple = await conexion.QueryMultipleAsync("sp_Checklist_Obtener", new { IdEquipo = idEquipo }, commandType: CommandType.StoredProcedure);
        var requisitos = (await multiple.ReadAsync<RequisitoChecklistDto>()).ToList();
        var ultima = (await multiple.ReadAsync<VerificacionChecklistDto>()).FirstOrDefault();
        var historial = (await multiple.ReadAsync<VerificacionChecklistDto>()).ToList();
        return (requisitos, ultima, historial);
    }

    public Task GuardarChecklistAsync(int idEquipo, IEnumerable<int> idsCumplidos, string? observaciones, int idUsuario) =>
        EjecutarAsync("sp_Checklist_Guardar", new
        {
            IdEquipo = idEquipo,
            IdsCumplidos = string.Join(",", idsCumplidos),
            Observaciones = observaciones,
            IdUsuario = idUsuario
        });

    public Task<List<DocumentoRepetidoraDto>> ListarDocumentosAsync(int idEquipo) =>
        ConsultarAsync<DocumentoRepetidoraDto>("sp_Documento_Listar", new { IdEquipo = idEquipo });

    public Task<DocumentoArchivoDto?> ObtenerDocumentoAsync(int idDocumento) =>
        PrimeroAsync<DocumentoArchivoDto>("sp_Documento_Obtener", new { IdDocumento = idDocumento });

    public Task<int> InsertarDocumentoAsync(int idEquipo, string tipoDocumento, string nombreDocumento, string nombreArchivo,
        string tipoContenido, byte[] contenido, int idUsuario) =>
        EscalarAsync<int>("sp_Documento_Insertar", new
        {
            IdEquipo = idEquipo,
            TipoDocumento = tipoDocumento,
            NombreDocumento = nombreDocumento,
            NombreArchivo = nombreArchivo,
            TipoContenido = tipoContenido,
            TamanoBytes = contenido.Length,
            Contenido = contenido,
            IdUsuario = idUsuario
        });

    public Task<List<BitacoraMantenimientoDto>> ListarBitacoraRepetidoraAsync(int idEquipo) =>
        ConsultarAsync<BitacoraMantenimientoDto>("sp_Repetidora_Bitacora", new { IdEquipo = idEquipo });

    public Task GuardarFichaRepetidoraAsync(int idEquipo, string frecuencia, string frecuenciaRecepcion, string potencia,
        string? accesorios, string direccionInstalacion, string? coordenadasGps, string clasificacion, int idUsuario) =>
        EjecutarAsync("sp_Repetidora_Guardar", new
        {
            IdEquipo = idEquipo,
            Frecuencia = frecuencia,
            FrecuenciaRecepcion = frecuenciaRecepcion,
            Potencia = potencia,
            Accesorios = accesorios,
            DireccionInstalacion = direccionInstalacion,
            CoordenadasGPS = coordenadasGps,
            Clasificacion = clasificacion,
            IdUsuario = idUsuario
        });
}
