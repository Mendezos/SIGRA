using Dapper;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using System.Data;

namespace SIGRA.DA.Repositorios;

public class InventarioDA : IInventarioDA
{
    private readonly IConexionFactory _conexionFactory;

    public InventarioDA(IConexionFactory conexionFactory) => _conexionFactory = conexionFactory;

    private async Task<List<T>> ConsultarAsync<T>(string sp, object? parametros = null)
    {
        using var conexion = _conexionFactory.CrearConexion();
        var filas = await conexion.QueryAsync<T>(sp, parametros, commandType: CommandType.StoredProcedure);
        return filas.ToList();
    }

    private async Task<T> EscalarAsync<T>(string sp, object? parametros = null)
    {
        using var conexion = _conexionFactory.CrearConexion();
        return await conexion.ExecuteScalarAsync<T>(sp, parametros, commandType: CommandType.StoredProcedure) ?? default!;
    }

    private async Task EjecutarAsync(string sp, object parametros)
    {
        using var conexion = _conexionFactory.CrearConexion();
        await conexion.ExecuteAsync(sp, parametros, commandType: CommandType.StoredProcedure);
    }

    // Accesorios y repuestos comparten la misma forma; el nombre del SP depende del tipo.
    private static string SufijoArticulo(string tipo) => tipo == "repuesto" ? "Repuesto" : "Accesorio";

    public Task<List<CategoriaDto>> ListarCategoriasAsync() => ConsultarAsync<CategoriaDto>("sp_Categoria_Listar");

    public Task<List<ProveedorDto>> ListarProveedoresAsync() => ConsultarAsync<ProveedorDto>("sp_Proveedor_Listar");

    public Task<List<ModeloDto>> ListarModelosAsync(int? idCategoria) =>
        ConsultarAsync<ModeloDto>("sp_Modelo_Listar", new { IdCategoria = idCategoria });

    public Task<bool> ExisteModeloAsync(int idModelo) => EscalarAsync<bool>("sp_Modelo_Existe", new { IdModelo = idModelo });

    public Task<bool> ExisteEquipoPorSerieAsync(string numeroSerie) =>
        EscalarAsync<bool>("sp_Equipo_ExistePorSerie", new { NumeroSerie = numeroSerie });

    public Task<int> InsertarEquipoAsync(int idCategoria, string marca, string modelo, string? descripcionTecnica, int idProveedor,
        string numeroSerie, string propietario, string? ubicacion, DateTime fechaAdquisicion, decimal costoCompra,
        string? foto, int cantidad, int idUsuario) =>
        EscalarAsync<int>("sp_Equipo_Insertar", new
        {
            IdCategoria = idCategoria,
            Marca = marca,
            Modelo = modelo,
            DescripcionTecnica = descripcionTecnica,
            IdProveedor = idProveedor,
            NumeroSerie = numeroSerie,
            Propietario = propietario,
            Ubicacion = ubicacion,
            FechaAdquisicion = fechaAdquisicion,
            CostoCompra = costoCompra,
            Foto = foto,
            Cantidad = cantidad,
            IdUsuario = idUsuario
        });

    public Task<List<EquipoListaDto>> ListarEquiposAsync(string? texto, int? idCategoria, string? estado) =>
        ConsultarAsync<EquipoListaDto>("sp_Equipo_Listar", new { Texto = texto, IdCategoria = idCategoria, Estado = estado });

    public async Task<EquipoDetalleDto?> ObtenerEquipoAsync(int? idEquipo, string? numeroSerie)
    {
        var filas = await ConsultarAsync<EquipoDetalleDto>("sp_Equipo_Obtener", new { IdEquipo = idEquipo, NumeroSerie = numeroSerie });
        return filas.FirstOrDefault();
    }

    public Task<List<HistorialEquipoDto>> ObtenerHistorialAsync(int idEquipo) =>
        ConsultarAsync<HistorialEquipoDto>("sp_Equipo_Historial", new { IdEquipo = idEquipo });

    public Task<bool> TieneContratoActivoAsync(int idEquipo) =>
        EscalarAsync<bool>("sp_Equipo_TieneContratoActivo", new { IdEquipo = idEquipo });

    public Task CambiarEstadoAsync(int idEquipo, string estadoNuevo, int idUsuario, string tipoMovimiento, string? observacion, string? motivoBaja) =>
        EjecutarAsync("sp_Equipo_CambiarEstado", new
        {
            IdEquipo = idEquipo,
            EstadoNuevo = estadoNuevo,
            IdUsuario = idUsuario,
            TipoMovimiento = tipoMovimiento,
            Observacion = observacion,
            MotivoBaja = motivoBaja
        });

    public Task AjustarCantidadAsync(int idEquipo, int delta, int idUsuario, string tipoMovimiento, string? observacion) =>
        EjecutarAsync("sp_Equipo_AjustarCantidad", new
        {
            IdEquipo = idEquipo,
            Delta = delta,
            IdUsuario = idUsuario,
            TipoMovimiento = tipoMovimiento,
            Observacion = observacion
        });

    public Task<List<MovimientoDto>> ListarMovimientosAsync(int? idEquipo, string? tipo) =>
        ConsultarAsync<MovimientoDto>("sp_Movimiento_Listar", new { IdEquipo = idEquipo, Tipo = tipo });

    public Task<List<StockCategoriaDto>> StockPorCategoriaAsync() => ConsultarAsync<StockCategoriaDto>("sp_Stock_PorCategoria");

    public Task<List<StockModeloDto>> StockPorModeloAsync(int? idCategoria) =>
        ConsultarAsync<StockModeloDto>("sp_Stock_PorModelo", new { IdCategoria = idCategoria });

    public Task GuardarStockMinimoAsync(int idCategoria, int cantidadMinima) =>
        EjecutarAsync("sp_StockMinimo_Guardar", new { IdCategoria = idCategoria, CantidadMinima = cantidadMinima });

    public Task<List<ArticuloBodegaDto>> ListarArticulosAsync(string tipo) =>
        ConsultarAsync<ArticuloBodegaDto>($"sp_{SufijoArticulo(tipo)}_Listar");

    public Task<bool> ExisteArticuloAsync(string tipo, int idModelo, string nombre, int? idExcluir) =>
        EscalarAsync<bool>($"sp_{SufijoArticulo(tipo)}_Existe", new { IdModelo = idModelo, Nombre = nombre, IdExcluir = idExcluir });

    public async Task<int> InsertarArticuloAsync(string tipo, int idModelo, string nombre, int cantidad) =>
        Convert.ToInt32(await EscalarAsync<decimal>($"sp_{SufijoArticulo(tipo)}_Insertar",
            new { IdModelo = idModelo, Nombre = nombre, Cantidad = cantidad }));

    public Task EditarArticuloAsync(string tipo, int id, string nombre, int cantidad) =>
        EjecutarAsync($"sp_{SufijoArticulo(tipo)}_Editar", new { Id = id, Nombre = nombre, Cantidad = cantidad });
}
