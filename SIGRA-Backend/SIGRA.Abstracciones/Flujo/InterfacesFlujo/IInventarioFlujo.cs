using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

public interface IInventarioFlujo
{
    Task<List<CategoriaDto>> ListarCategoriasAsync();
    Task<List<ProveedorDto>> ListarProveedoresAsync();
    Task<List<ModeloDto>> ListarModelosAsync(int? idCategoria);

    Task<int> RegistrarEquipoAsync(RegistrarEquipoDto dto, int idUsuario);
    Task<bool> ExisteSerieAsync(string numeroSerie);
    Task<List<EquipoListaDto>> ListarEquiposAsync(string? texto, int? idCategoria, string? estado);
    Task<FichaEquipoDto> ObtenerFichaPorSerieAsync(string numeroSerie);
    Task<FichaEquipoDto> ObtenerFichaPorIdAsync(int idEquipo);
    Task<FichaEquipoDto> CambiarEstadoAsync(int idEquipo, CambiarEstadoEquipoDto dto, int idUsuario);
    Task<FichaEquipoDto> RegistrarEntradaAsync(RegistrarMovimientoEquipoDto dto, int idUsuario);
    Task<FichaEquipoDto> RegistrarSalidaAsync(RegistrarMovimientoEquipoDto dto, int idUsuario);
    Task<List<MovimientoDto>> ListarMovimientosAsync(int? idEquipo, string? tipo);

    Task<List<StockCategoriaDto>> StockPorCategoriaAsync();
    Task<List<StockModeloDto>> StockPorModeloAsync(int? idCategoria);
    Task GuardarStockMinimoAsync(int idCategoria, GuardarStockMinimoDto dto, int idUsuario);

    Task<List<ArticuloBodegaDto>> ListarArticulosAsync(string tipo);
    Task<int> CrearArticuloAsync(string tipo, GuardarArticuloBodegaDto dto, int idUsuario);
    Task EditarArticuloAsync(string tipo, int id, GuardarArticuloBodegaDto dto, int idUsuario);
}
