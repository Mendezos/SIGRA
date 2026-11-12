using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.API.Extensions;

namespace SIGRA.API.Controllers;

[ApiController, Authorize, Route("api/notificaciones")]
public class NotificacionesController(INotificacionesDA notificaciones) : ControllerBase
{
    [HttpGet] public Task<List<NotificacionDto>> Listar() => notificaciones.ListarAsync(User.ObtenerIdUsuario());
    [HttpGet("resumen")] public Task<ResumenNotificacionesDto> Resumen() => notificaciones.ObtenerResumenAsync(User.ObtenerIdUsuario());
    [HttpPost("leer-todas")] public async Task<MarcarTodasLeidasResultadoDto> LeerTodas()
        => new() { Marcadas = await notificaciones.MarcarTodasLeidasAsync(User.ObtenerIdUsuario()) };
    [HttpPost("{id:long}/leer")] public async Task<IActionResult> Leer(long id)
    { await notificaciones.MarcarLeidaAsync(id, User.ObtenerIdUsuario()); return NoContent(); }
}
