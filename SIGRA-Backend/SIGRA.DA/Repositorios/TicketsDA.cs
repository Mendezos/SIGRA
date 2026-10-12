using System.Data;
using System.Text.Json;
using Dapper;
using Microsoft.Data.SqlClient;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Modelos;

namespace SIGRA.DA.Repositorios;

public class TicketsDA(IConexionFactory conexionFactory) : ITicketsDA
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private async Task<List<T>> ConsultarAsync<T>(string procedimiento, object? parametros = null)
    {
        using var conexion = conexionFactory.CrearConexion();
        return (await conexion.QueryAsync<T>(procedimiento, parametros, commandType: CommandType.StoredProcedure)).ToList();
    }

    private async Task<int> EscribirAsync(string procedimiento, object parametros)
    {
        using var conexion = conexionFactory.CrearConexion();
        try
        {
            return await conexion.ExecuteScalarAsync<int>(procedimiento, parametros, commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex) when (ex.Number is 50002 or 1205)
        { throw new ConflictoDatosException(ex.Number == 1205 ? "Otra operación actualizó los datos. Intentá nuevamente." : ex.Message); }
        catch (SqlException ex) when (ex.Number == 50003)
        { throw new ConfirmacionRequeridaException(ex.Message, "CARGA_MAXIMA"); }
        catch (SqlException ex) when (ex.Number == 50004)
        { throw new ConfirmacionRequeridaException(ex.Message, "ALQUILER_OTRO_CLIENTE"); }
        catch (SqlException ex) when (ex.Number == 50001)
        { throw new ReglaNegocioException(ex.Message); }
        catch (SqlException ex) when (ex.Number is 2601 or 2627)
        { throw new ReglaNegocioException("El registro ya existe. Revisá los números de serie y actualizá el listado."); }
    }

    public Task<List<ResponsableAuditoriaTicketDto>> ResponsablesAuditoriaAsync() =>
        ConsultarAsync<ResponsableAuditoriaTicketDto>("sp_Ticket_Catalogos", new { Operacion = "Usuarios" });

    public async Task<AccesoModuloModel?> AccesoAsync(int idUsuario) =>
        (await ConsultarAsync<AccesoModuloModel>("sp_Ticket_Catalogos", new { Operacion = "Acceso", IdUsuario = idUsuario })).FirstOrDefault();

    public async Task<PaginaDto<TicketDetalleDto>> ListarAsync(FiltroTicketsDto filtro)
    {
        using var conexion = conexionFactory.CrearConexion();
        using var resultados = await conexion.QueryMultipleAsync("sp_Ticket_Listar", new { Filtro = JsonSerializer.Serialize(filtro, Json) }, commandType: CommandType.StoredProcedure);
        var items = (await resultados.ReadAsync<TicketFilaModel>()).Select(Completar).ToList();
        return new() { Items = items, Total = await resultados.ReadSingleAsync<int>(), Pagina = filtro.Pagina, TamanoPagina = filtro.TamanoPagina };
    }

    public async Task<ResumenTicketsDto> ResumenAsync(int? idTecnico) =>
        (await ConsultarAsync<ResumenTicketsDto>("sp_Ticket_Resumen", new { IdTecnico = idTecnico })).Single();

    public async Task<TicketDetalleDto?> ObtenerAsync(int idTicket)
    {
        using var conexion = conexionFactory.CrearConexion();
        using var resultados = await conexion.QueryMultipleAsync("sp_Ticket_Obtener", new { IdTicket = idTicket }, commandType: CommandType.StoredProcedure);
        var fila = await resultados.ReadFirstOrDefaultAsync<TicketFilaModel>();
        if (fila is null) return null;
        var ticket = Completar(fila);
        ticket.Equipos = (await resultados.ReadAsync<EquipoFila>()).Select(e =>
        {
            e.Accesorios = LeerAccesorios(e.AccesoriosJson);
            return (EquipoEntradaDto)e;
        }).ToList();
        ticket.Estados = (await resultados.ReadAsync<EstadoTicketDto>()).ToList();
        ticket.Asignaciones = (await resultados.ReadAsync<AsignacionTicketDto>()).ToList();
        ticket.Ediciones = (await resultados.ReadAsync<EdicionTicketDto>()).ToList();
        return ticket;
    }

    public async Task<SeguimientoTicketDto?> SeguimientoAsync(string codigo) =>
        (await ConsultarAsync<SeguimientoTicketDto>("sp_Ticket_Seguimiento", new { Codigo = codigo })).FirstOrDefault();

    public Task<List<SeguimientoTicketDto>> SeguimientoClienteAsync(string empresa) =>
        ConsultarAsync<SeguimientoTicketDto>("sp_Ticket_Seguimiento", new { Empresa = empresa });

    public Task<List<ClienteDto>> ClientesAsync(string? texto) =>
        ConsultarAsync<ClienteDto>("sp_Ticket_Catalogos", new { Operacion = "Clientes", Texto = texto });

    public async Task<List<TecnicoTicketDto>> TecnicosAsync()
    {
        using var conexion = conexionFactory.CrearConexion();
        using var resultados = await conexion.QueryMultipleAsync("sp_Ticket_Catalogos", new { Operacion = "Tecnicos" }, commandType: CommandType.StoredProcedure);
        var tecnicos = (await resultados.ReadAsync<TecnicoTicketDto>()).ToList();
        var especialidades = (await resultados.ReadAsync<EspecialidadFila>()).ToList();
        foreach (var tecnico in tecnicos) tecnico.Especialidades = especialidades.Where(e => e.IdUsuario == tecnico.IdUsuario).Select(e => e.Especialidad).ToList();
        return tecnicos;
    }

    public async Task<ConfiguracionTicketsDto> ConfiguracionAsync() =>
        (await ConsultarAsync<ConfiguracionTicketsDto>("sp_Ticket_Catalogos", new { Operacion = "Configuracion" })).Single();

    public async Task GuardarConfiguracionAsync(ConfiguracionTicketsDto configuracion, int idUsuario) =>
        _ = await EscribirAsync("sp_Ticket_Configurar", new { Operacion = "Configuracion", IdUsuario = idUsuario, Datos = JsonSerializer.Serialize(configuracion, Json), IdTecnico = (int?)null });

    public async Task GuardarEspecialidadesAsync(int idTecnico, List<string> especialidades, int idUsuario) =>
        _ = await EscribirAsync("sp_Ticket_Configurar", new { Operacion = "Especialidades", IdUsuario = idUsuario, Datos = JsonSerializer.Serialize(especialidades, Json), IdTecnico = idTecnico });

    public Task<List<EquipoContratoModel>> EquiposContratosAsync(List<string> series) =>
        ConsultarAsync<EquipoContratoModel>("sp_Ticket_Catalogos", new { Operacion = "EquiposContratos", Datos = JsonSerializer.Serialize(series, Json) });

    public Task<int> RegistrarAsync(RegistrarTicketDto dto, int idUsuario) =>
        EscribirAsync("sp_Ticket_Registrar", new { Datos = JsonSerializer.Serialize(dto, Json), IdUsuario = idUsuario });

    public async Task CambiarAsync(CambioTicket cambio) => _ = await EscribirAsync("sp_Ticket_Cambiar", cambio);

    public Task<List<HistorialTicketDto>> HistorialAsync(FiltroHistorialTicketsDto filtro) =>
        ConsultarAsync<HistorialTicketDto>("sp_Ticket_Historial", new { Filtro = JsonSerializer.Serialize(filtro, Json) });

    public async Task<IndicadoresTicketsDto> IndicadoresAsync(DateOnly? desde, DateOnly? hasta)
    {
        using var conexion = conexionFactory.CrearConexion();
        using var resultados = await conexion.QueryMultipleAsync("sp_Ticket_Indicadores", new { Desde = desde?.ToDateTime(TimeOnly.MinValue), Hasta = hasta?.ToDateTime(TimeOnly.MinValue) }, commandType: CommandType.StoredProcedure);
        return new() { Tecnicos = (await resultados.ReadAsync<IndicadorTecnicoDto>()).ToList(), Motivos = (await resultados.ReadAsync<MotivoNoReparacionDto>()).ToList() };
    }

    public Task<List<AuditoriaTicketDto>> AuditoriaAsync(FiltroAuditoriaTicketsDto filtro) =>
        ConsultarAsync<AuditoriaTicketDto>("sp_Ticket_Auditoria", new { Filtro = JsonSerializer.Serialize(filtro, Json) });

    public async Task<List<GarantiaTicketDto>> GarantiasAsync(FiltroGarantiasDto filtro)
    {
        using var conexion = conexionFactory.CrearConexion();
        using var resultados = await conexion.QueryMultipleAsync("sp_Ticket_Garantias", new { Filtro = JsonSerializer.Serialize(filtro, Json) }, commandType: CommandType.StoredProcedure);
        var garantias = (await resultados.ReadAsync<GarantiaTicketDto>()).ToList();
        var seguimientos = (await resultados.ReadAsync<SeguimientoFila>()).ToList();
        foreach (var garantia in garantias) garantia.Seguimiento = seguimientos.Where(s => s.IdGarantia == garantia.IdGarantia).Cast<SeguimientoGarantiaDto>().ToList();
        return garantias;
    }

    public async Task AgregarSeguimientoAsync(long idGarantia, AgregarSeguimientoGarantiaDto dto, int idUsuario) =>
        _ = await EscribirAsync("sp_Ticket_GarantiaSeguimiento", new { IdGarantia = idGarantia, IdUsuario = idUsuario, Estado = dto.Estado, Nota = dto.Nota });

    private static TicketDetalleDto Completar(TicketFilaModel fila)
    {
        fila.Version = Convert.ToBase64String(fila.VersionBytes);
        fila.Trabajo = JsonSerializer.Deserialize<TrabajoTicketDto>(fila.TrabajoJson ?? "{}", Json) ?? new();
        return fila;
    }

    private static List<string> LeerAccesorios(string? datos)
    {
        if (string.IsNullOrWhiteSpace(datos)) return new();
        try { return JsonSerializer.Deserialize<List<string>>(datos, Json) ?? new(); }
        catch (JsonException) { return datos.Split([',',';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(); }
    }

    private sealed class EquipoFila : EquipoEntradaDto { public string? AccesoriosJson { get; set; } }
    private sealed class EspecialidadFila { public int IdUsuario { get; set; } public string Especialidad { get; set; } = ""; }
    private sealed class SeguimientoFila : SeguimientoGarantiaDto { public long IdGarantia { get; set; } }
}
