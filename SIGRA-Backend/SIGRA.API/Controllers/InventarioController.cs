using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;

namespace SIGRA.API.Controllers;

[ApiController]
[Route("api/inventario")]
public class InventarioController : ControllerBase
{
    private const string RolesEscritura = "Administrador del sistema,Coordinador tecnico,Tecnico";
    private const string RolesLectura = "Administrador del sistema,Gerente,Coordinador tecnico,Tecnico,Vendedor / Ejecutivo de cuenta";

    private readonly IInventarioFlujo _flujo;

    public InventarioController(IInventarioFlujo flujo) => _flujo = flujo;

    // ---------- Catálogos ----------
    [HttpGet("categorias")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<CategoriaDto>>> Categorias() => Ok(await _flujo.ListarCategoriasAsync());

    [HttpGet("proveedores")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<ProveedorDto>>> Proveedores() => Ok(await _flujo.ListarProveedoresAsync());

    [HttpGet("modelos")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<ModeloDto>>> Modelos([FromQuery] int? idCategoria) =>
        Ok(await _flujo.ListarModelosAsync(idCategoria));

    // ---------- Equipos ----------
    [HttpGet("equipos")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<EquipoListaDto>>> ListarEquipos(
        [FromQuery] string? texto, [FromQuery] int? idCategoria, [FromQuery] string? estado) =>
        Ok(await _flujo.ListarEquiposAsync(texto, idCategoria, estado));

    [HttpGet("equipos/existe-serie")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult> ExisteSerie([FromQuery] string serie) =>
        Ok(new { existe = await _flujo.ExisteSerieAsync(serie) });

    [HttpGet("equipos/serie/{numeroSerie}")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<FichaEquipoDto>> FichaPorSerie(string numeroSerie) =>
        Ok(await _flujo.ObtenerFichaPorSerieAsync(numeroSerie));

    [HttpGet("equipos/{idEquipo:int}")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<FichaEquipoDto>> FichaPorId(int idEquipo) =>
        Ok(await _flujo.ObtenerFichaPorIdAsync(idEquipo));

    [HttpPost("equipos")]
    [Authorize(Roles = RolesEscritura)]
    public async Task<ActionResult<FichaEquipoDto>> RegistrarEquipo([FromBody] RegistrarEquipoDto dto)
    {
        var idEquipo = await _flujo.RegistrarEquipoAsync(dto, User.ObtenerIdUsuario());
        return Ok(await _flujo.ObtenerFichaPorIdAsync(idEquipo));
    }

    [HttpPatch("equipos/{idEquipo:int}/estado")]
    [Authorize(Roles = RolesEscritura)]
    public async Task<ActionResult<FichaEquipoDto>> CambiarEstado(int idEquipo, [FromBody] CambiarEstadoEquipoDto dto) =>
        Ok(await _flujo.CambiarEstadoAsync(idEquipo, dto, User.ObtenerIdUsuario()));

    // ---------- Movimientos ----------
    [HttpGet("movimientos")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<MovimientoDto>>> Movimientos([FromQuery] int? idEquipo, [FromQuery] string? tipo) =>
        Ok(await _flujo.ListarMovimientosAsync(idEquipo, tipo));

    [HttpPost("movimientos/entrada")]
    [Authorize(Roles = RolesEscritura)]
    public async Task<ActionResult<FichaEquipoDto>> Entrada([FromBody] RegistrarMovimientoEquipoDto dto) =>
        Ok(await _flujo.RegistrarEntradaAsync(dto, User.ObtenerIdUsuario()));

    [HttpPost("movimientos/salida")]
    [Authorize(Roles = RolesEscritura)]
    public async Task<ActionResult<FichaEquipoDto>> Salida([FromBody] RegistrarMovimientoEquipoDto dto) =>
        Ok(await _flujo.RegistrarSalidaAsync(dto, User.ObtenerIdUsuario()));

    // ---------- Stock ----------
    [HttpGet("stock/categorias")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<StockCategoriaDto>>> StockCategorias() => Ok(await _flujo.StockPorCategoriaAsync());

    [HttpGet("stock/modelos")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<StockModeloDto>>> StockModelos([FromQuery] int? idCategoria) =>
        Ok(await _flujo.StockPorModeloAsync(idCategoria));

    [HttpPut("stock/categorias/{idCategoria:int}/minimo")]
    [Authorize(Roles = "Administrador del sistema,Coordinador tecnico")]
    public async Task<ActionResult> GuardarMinimo(int idCategoria, [FromBody] GuardarStockMinimoDto dto)
    {
        await _flujo.GuardarStockMinimoAsync(idCategoria, dto, User.ObtenerIdUsuario());
        return NoContent();
    }

    // ---------- Accesorios y repuestos ----------
    [HttpGet("{tipo}")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<ArticuloBodegaDto>>> ListarArticulos(string tipo) =>
        Ok(await _flujo.ListarArticulosAsync(ValidarTipo(tipo)));

    [HttpPost("{tipo}")]
    [Authorize(Roles = RolesEscritura)]
    public async Task<ActionResult> CrearArticulo(string tipo, [FromBody] GuardarArticuloBodegaDto dto)
    {
        var id = await _flujo.CrearArticuloAsync(ValidarTipo(tipo), dto, User.ObtenerIdUsuario());
        return Ok(new { id });
    }

    [HttpPut("{tipo}/{id:int}")]
    [Authorize(Roles = RolesEscritura)]
    public async Task<ActionResult> EditarArticulo(string tipo, int id, [FromBody] GuardarArticuloBodegaDto dto)
    {
        await _flujo.EditarArticuloAsync(ValidarTipo(tipo), id, dto, User.ObtenerIdUsuario());
        return NoContent();
    }

    private static string ValidarTipo(string tipo)
    {
        var normalizado = tipo.ToLowerInvariant();
        if (normalizado is not ("accesorios" or "repuestos"))
            throw new ReglaNegocioException("El tipo de artículo indicado no es válido.");
        return normalizado == "repuestos" ? "repuesto" : "accesorio";
    }
}
