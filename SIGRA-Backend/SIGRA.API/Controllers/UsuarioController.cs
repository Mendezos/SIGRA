using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;

namespace SIGRA.API.Controllers;

[ApiController]
[Route("api/usuarios")]
[Authorize(Roles = "Administrador del sistema,Gerente")]
public class UsuarioController : ControllerBase
{
    private const string RolAdministrador = "Administrador del sistema";

    private readonly IUsuarioFlujo _flujo;

    public UsuarioController(IUsuarioFlujo flujo) => _flujo = flujo;

    [HttpGet]
    public async Task<ActionResult<List<UsuarioDto>>> Listar()
    {
        return Ok(await _flujo.ListarAsync());
    }

    [HttpGet("roles")]
    public async Task<ActionResult<List<RolDto>>> RolesAsignables()
    {
        return Ok(await _flujo.ListarRolesAsignablesAsync(User.IsInRole(RolAdministrador)));
    }

    [HttpPost]
    public async Task<ActionResult<UsuarioDto>> Crear([FromBody] CrearUsuarioDto dto)
    {
        var nuevo = await _flujo.CrearAsync(dto, User.ObtenerIdUsuario(), User.IsInRole(RolAdministrador));
        return Ok(nuevo);
    }

    [Authorize(Roles = RolAdministrador)]
    [HttpPut("{idUsuario:int}/password")]
    public async Task<IActionResult> CambiarPassword(int idUsuario, [FromBody] CambiarPasswordUsuarioDto dto)
    {
        await _flujo.CambiarPasswordAsync(idUsuario, dto.PasswordNueva, User.ObtenerIdUsuario());
        return Ok(new RespuestaMensajeDto { Mensaje = "Contraseña actualizada correctamente. El usuario debe iniciar sesión de nuevo." });
    }
}
