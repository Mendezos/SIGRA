using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;

namespace SIGRA.API.Controllers;

// DAR-003, 018 y 019: alertas unificadas. Los permisos se revisan en el flujo porque dependen del módulo de cada alerta
// (atender una alerta no exige permiso de escritura sobre el dashboard, sino sobre el módulo que la originó).
[ApiController]
[Route("api/alertas")]
public class AlertasController(IAlertasFlujo flujo) : ControllerBase
{
    [HttpGet]
    public Task<ListadoAlertasDto> Listar() => flujo.ListarAsync(User.ObtenerIdUsuario());

    [HttpPost("atender")]
    public Task<ListadoAlertasDto> Atender([FromBody] AtenderAlertaUnificadaDto dto) => flujo.AtenderAsync(dto, User.ObtenerIdUsuario());

    [HttpGet("vistas")]
    public Task<List<VistaFavoritaDto>> Vistas() => flujo.ListarVistasAsync(User.ObtenerIdUsuario());

    [HttpPost("vistas")]
    public Task<List<VistaFavoritaDto>> GuardarVista([FromBody] GuardarVistaDto dto) => flujo.GuardarVistaAsync(dto, User.ObtenerIdUsuario());

    [HttpDelete("vistas/{idVista:int}")]
    public Task<List<VistaFavoritaDto>> EliminarVista(int idVista) => flujo.EliminarVistaAsync(idVista, User.ObtenerIdUsuario());
}
