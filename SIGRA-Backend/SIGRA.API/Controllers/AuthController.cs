using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;

namespace SIGRA.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAutenticacionFlujo _flujo;

    public AuthController(IAutenticacionFlujo flujo) => _flujo = flujo;

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto dto)
    {
        var resultado = await _flujo.LoginAsync(dto.Correo, dto.Password);
        return Ok(resultado);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await _flujo.LogoutAsync(User.ObtenerTokenId());
        return Ok(new RespuestaMensajeDto { Mensaje = "Sesión cerrada correctamente." });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<PerfilUsuarioDto>> Me()
    {
        var perfil = await _flujo.ObtenerPerfilAsync(User.ObtenerIdUsuario());
        return Ok(perfil);
    }
}
