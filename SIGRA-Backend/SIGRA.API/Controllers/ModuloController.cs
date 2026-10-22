using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Filters;

namespace SIGRA.API.Controllers;

[ApiController]
[Route("api/modulos")]
[Authorize(Roles = "Administrador del sistema")]
[PermisoModulo(1)]
public class ModuloController : ControllerBase
{
    private readonly IModuloFlujo _flujo;

    public ModuloController(IModuloFlujo flujo) => _flujo = flujo;

    [HttpGet]
    public async Task<ActionResult<List<ModuloDto>>> Listar()
    {
        return Ok(await _flujo.ListarAsync());
    }
}
