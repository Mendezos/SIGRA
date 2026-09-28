using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;
using SIGRA.API.Filters;

namespace SIGRA.API.Controllers;

[ApiController]
[Route("api/cuentas")]
[Authorize(Roles = "Administrador del sistema")]
public class CuentasController : ControllerBase
{
    private readonly ICuentaFlujo _flujo;
    private readonly IGestionCuentasFlujo _gestion;

    public CuentasController(ICuentaFlujo flujo, IGestionCuentasFlujo gestion)
    {
        _flujo = flujo;
        _gestion = gestion;
    }

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

    [HttpGet]
    [PermisoCuentas("Lectura")]
    public async Task<IActionResult> Listar([FromQuery] FiltroCuentasDto filtro) =>
        Ok(await _gestion.ListarAsync(filtro));

    [HttpPost]
    [PermisoCuentas("Escritura")]
    public async Task<IActionResult> Crear([FromBody] CrearCuentaDto dto)
    {
        var idUsuario = await _gestion.CrearAsync(dto, User.ObtenerIdUsuario());
        return CreatedAtAction(nameof(Estado), new { idUsuario }, new { idUsuario });
    }

    [HttpPut("{idUsuario:int}")]
    [PermisoCuentas("Edicion")]
    public async Task<IActionResult> Editar(
        int idUsuario, [FromBody] DatosCuentaDto dto)
    {
        await _gestion.EditarAsync(idUsuario, dto, User.ObtenerIdUsuario());
        return Ok(new RespuestaMensajeDto
        {
            Mensaje = "Cuenta actualizada correctamente."
        });
    }

    [HttpPatch("{idUsuario:int}/estado")]
    [PermisoCuentas("Eliminacion")]
    public async Task<IActionResult> CambiarEstado(
        int idUsuario, [FromBody] CambiarEstadoCuentaDto dto)
    {
        await _gestion.CambiarEstadoAsync(idUsuario, dto, User.ObtenerIdUsuario());
        return Ok(new RespuestaMensajeDto
        {
            Mensaje = "Estado actualizado correctamente."
        });
    }

    [HttpPatch("{idUsuario:int}/rol")]
    [PermisoCuentas("Edicion")]
    public async Task<IActionResult> CambiarRol(
        int idUsuario, [FromBody] CambiarRolCuentaDto dto)
    {
        await _gestion.CambiarRolAsync(idUsuario, dto, User.ObtenerIdUsuario());
        return Ok(new RespuestaMensajeDto
        {
            Mensaje = "Rol actualizado correctamente."
        });
    }

    [HttpGet("roles")]
    [PermisoCuentas("Lectura")]
    public async Task<IActionResult> Roles() =>
        Ok(await _gestion.RolesAsync());

    [HttpGet("auditoria")]
    [PermisoCuentas("Lectura")]
    public async Task<IActionResult> Auditoria(
        [FromQuery] FiltroAuditoriaDto filtro) =>
        Ok(await _gestion.AuditoriaAsync(filtro));
    }
