using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Filters;

namespace SIGRA.API.Controllers;

[ApiController]
[Route("api/encuestas")]
public class EncuestasController(IEncuestaFlujo flujo) : ControllerBase
{
    [HttpGet]
    [PermisoModulo(7)]
    public Task<List<EncuestaSatisfaccionDto>> Listar() => flujo.ListarAsync();

    [HttpPost("{idEncuesta:int}/reenviar")]
    [PermisoModulo(7)]
    public Task<ReenvioEncuestaResultadoDto> Reenviar(int idEncuesta) =>
        flujo.ReenviarAsync(idEncuesta);

    [HttpGet("clientes/{idCliente:int}/historial")]
    [PermisoModulo(7)]
    public Task<HistorialClienteFinancieroDto> HistorialCliente(int idCliente) =>
        flujo.ObtenerHistorialClienteAsync(idCliente);

    [AllowAnonymous]
    [HttpGet("publica/{token}")]
    public Task<EncuestaPublicaDto> ObtenerPublica(string token) =>
        flujo.ObtenerPublicaAsync(token);

    [AllowAnonymous]
    [HttpPost("publica/{token}/responder")]
    public Task<RespuestaEncuestaResultadoDto> Responder(
        string token,
        ResponderEncuestaDto dto) =>
        flujo.ResponderAsync(token, dto);
}
