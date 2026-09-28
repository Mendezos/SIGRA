using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;

namespace SIGRA.API.Controllers;

[ApiController]
[Route("api/cuentas")]
[Authorize(Roles = "Administrador del sistema")]
public class CuentasController : ControllerBase
{
    private readonly ICuentaFlujo _flujo;

    public CuentasController(ICuentaFlujo flujo) => _flujo = flujo;

    [HttpGet("{idUsuario:int}/estado")]
    public async Task<ActionResult<EstadoCuentaDto>> Estado(int idUsuario)
    {
        return Ok(await _flujo.ObtenerEstadoAsync(idUsuario));
    }

    [HttpGet("bloqueadas")]
    public async Task<ActionResult<List<EstadoCuentaDto>>> Bloqueadas()
    {
        return Ok(await _flujo.ObtenerCuentasBloqueadasAsync());
    }

    [HttpPost("{idUsuario:int}/desbloquear")]
    public async Task<IActionResult> Desbloquear(int idUsuario, [FromBody] DesbloquearCuentaDto dto)
    {
        await _flujo.DesbloquearCuentaAsync(idUsuario, User.ObtenerIdUsuario(), dto.Motivo);
        return Ok(new RespuestaMensajeDto { Mensaje = "Cuenta desbloqueada correctamente." });
    }
}
