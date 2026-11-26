using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Filters;

namespace SIGRA.API.Controllers;

// Módulo 5 (Dashboard y reportes) - DAR: indicadores.
[ApiController]
[PermisoModulo(5)]
[Route("api/dashboard")]
public class DashboardController(IDashboardFlujo flujo) : ControllerBase
{
    [HttpGet("inventario")]
    public async Task<ActionResult<DashboardInventarioDto>> Inventario(
        [FromQuery] int? idCategoria, [FromQuery] int? idModelo, [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta) =>
        Ok(await flujo.ObtenerInventarioAsync(idCategoria, idModelo, desde, hasta));
}
