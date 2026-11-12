using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;

namespace SIGRA.API.Controllers;

[ApiController]
[Route("api/cotizaciones")]
public class CotizacionesController(ICotizacionFlujo flujo) : ControllerBase
{
    [HttpPost]
    public Task<CotizacionDto> Registrar(RegistrarCotizacionDto dto) =>
        flujo.RegistrarAsync(dto, User.ObtenerIdUsuario());

    [HttpGet]
    public Task<List<CotizacionDto>> Listar() => flujo.ListarAsync();

    [HttpPut("{idCotizacion:int}")]
    public Task<CotizacionDto> Actualizar(
        int idCotizacion,
        RegistrarCotizacionDto dto) =>
        flujo.ActualizarAsync(idCotizacion, dto, User.ObtenerIdUsuario());

    [HttpGet("{idCotizacion:int}")]
    public async Task<IActionResult> Obtener(int idCotizacion)
    {
        var cotizacion = await flujo.ObtenerAsync(idCotizacion);
        return cotizacion is null ? NotFound() : Ok(cotizacion);
    }

    [HttpPatch("{idCotizacion:int}/estado")]
    public Task<CotizacionDto> CambiarEstado(
        int idCotizacion,
        CambiarEstadoCotizacionDto dto) =>
        flujo.CambiarEstadoAsync(idCotizacion, dto, User.ObtenerIdUsuario());

    [HttpPatch("{idCotizacion:int}/desactivar")]
    public Task<CotizacionDto> Desactivar(int idCotizacion) =>
        flujo.DesactivarAsync(idCotizacion, User.ObtenerIdUsuario());
}
