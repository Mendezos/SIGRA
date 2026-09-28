using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;

namespace SIGRA.API.Controllers;

[ApiController]
[Route("api/roles")]
[Authorize(Roles = "Administrador del sistema")]
public class RolController : ControllerBase
{
    private readonly IRolFlujo _flujo;

    public RolController(IRolFlujo flujo) => _flujo = flujo;

    [HttpPost]
    public async Task<ActionResult<RolDto>> Crear([FromBody] CrearRolDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            throw new ValidacionException("Debe completar todos los parámetros obligatorios.", new List<string> { "Nombre del rol" });

        var nuevo = await _flujo.CrearAsync(dto.Nombre, User.ObtenerIdUsuario());

        return Ok(new RolDto { IdRol = nuevo.IdRol, Nombre = nuevo.Nombre, Activo = nuevo.Activo });
    }
}
