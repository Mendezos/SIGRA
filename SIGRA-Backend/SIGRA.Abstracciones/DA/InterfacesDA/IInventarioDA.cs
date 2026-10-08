using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface IInventarioDA
{
    Task<List<CategoriaDto>> ListarCategoriasAsync();
    Task<List<ProveedorDto>> ListarProveedoresAsync();
    Task<List<ModeloDto>> ListarModelosAsync(int? idCategoria);
    Task<bool> ExisteModeloAsync(int idModelo);

    Task<bool> ExisteEquipoPorSerieAsync(string numeroSerie);
    Task<int> InsertarEquipoAsync(int idCategoria, string marca, string modelo, string? descripcionTecnica, int idProveedor,
        string numeroSerie, string propietario, string? ubicacion, DateTime fechaAdquisicion, decimal costoCompra,
        string? foto, int cantidad, int idUsuario);
    Task<List<EquipoListaDto>> ListarEquiposAsync(string? texto, int? idCategoria, string? estado);
    Task<EquipoDetalleDto?> ObtenerEquipoAsync(int? idEquipo, string? numeroSerie);
    Task<List<HistorialEquipoDto>> ObtenerHistorialAsync(int idEquipo);
    Task<bool> TieneContratoActivoAsync(int idEquipo);
    Task CambiarEstadoAsync(int idEquipo, string estadoNuevo, int idUsuario, string tipoMovimiento, string? observacion, string? motivoBaja);
    Task AjustarCantidadAsync(int idEquipo, int delta, int idUsuario, string tipoMovimiento, string? observacion);
    Task<List<MovimientoDto>> ListarMovimientosAsync(int? idEquipo, string? tipo);

    Task<List<StockCategoriaDto>> StockPorCategoriaAsync();
    Task<List<StockModeloDto>> StockPorModeloAsync(int? idCategoria);
    Task GuardarStockMinimoAsync(int idCategoria, int cantidadMinima);

    Task<List<ArticuloBodegaDto>> ListarArticulosAsync(string tipo);
    Task<bool> ExisteArticuloAsync(string tipo, int idModelo, string nombre, int? idExcluir);
    Task<int> InsertarArticuloAsync(string tipo, int idModelo, string nombre, int cantidad);
    Task EditarArticuloAsync(string tipo, int id, string nombre, int cantidad);
}
