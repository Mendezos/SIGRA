using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;

namespace SIGRA.API.Controllers;

[ApiController]
[Route("api/recuperacion-password")]
[AllowAnonymous]
public class RecuperacionPasswordController : ControllerBase
{
    private readonly IRecuperacionPasswordFlujo _flujo;

    public RecuperacionPasswordController(IRecuperacionPasswordFlujo flujo) => _flujo = flujo;

    [HttpPost("solicitar")]
    public async Task<IActionResult> Solicitar([FromBody] SolicitarRecuperacionDto dto)
    {
        await _flujo.SolicitarRecuperacionAsync(dto.Correo);
        return Ok(new RespuestaMensajeDto { Mensaje = "Si la cuenta existe y está activa, se envió un enlace de recuperación a su correo." });
    }

    [HttpGet("validar/{token}")]
    public async Task<IActionResult> Validar(string token)
    {
        await _flujo.ValidarTokenAsync(token);
        return Ok(new RespuestaMensajeDto { Mensaje = "Token válido." });
    }

    [HttpPost("restablecer")]
    public async Task<IActionResult> Restablecer([FromBody] RestablecerPasswordDto dto)
    {
        await _flujo.RestablecerPasswordAsync(dto.Token, dto.NuevaPassword);
        return Ok(new RespuestaMensajeDto { Mensaje = "Contraseña actualizada correctamente. Ya puede iniciar sesión." });
    }
}
