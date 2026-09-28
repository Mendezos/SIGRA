using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Modelos;
using SIGRA.API.Extensions;

namespace SIGRA.API.Controllers;

[ApiController]
[Route("api/politica-seguridad")]
[Authorize(Roles = "Administrador del sistema")]
public class PoliticaSeguridadController : ControllerBase
{
    private readonly IPoliticaSeguridadFlujo _flujo;

    public PoliticaSeguridadController(IPoliticaSeguridadFlujo flujo) => _flujo = flujo;

    [HttpGet("activa")]
    public async Task<ActionResult<PoliticaSeguridadModel>> Activa()
    {
        return Ok(await _flujo.ObtenerActivaAsync());
    }

    [HttpPost]
    public async Task<ActionResult<PoliticaSeguridadModel>> Crear([FromBody] ConfigurarPoliticaDto dto)
    {
        var faltantes = new List<string>();
        if (dto.MinutosInactividad is null) faltantes.Add("Minutos máximos de inactividad");
        if (dto.MaxIntentosFallidos is null) faltantes.Add("Cantidad máxima de intentos fallidos");
        if (dto.LongitudMinimaPassword is null) faltantes.Add("Longitud mínima de contraseña");
        if (dto.MinutosBloqueo is null) faltantes.Add("Minutos de bloqueo");
        if (dto.VigenciaEnlaceMinutos is null) faltantes.Add("Vigencia del enlace de recuperación");

        if (faltantes.Count > 0)
            throw new ValidacionException("Debe completar todos los parámetros obligatorios.", faltantes);

        var resultado = await _flujo.CrearNuevaVersionAsync(
            dto.MinutosInactividad!.Value,
            dto.MaxIntentosFallidos!.Value,
            dto.LongitudMinimaPassword!.Value,
            dto.MinutosBloqueo!.Value,
            dto.VigenciaEnlaceMinutos!.Value,
            User.ObtenerIdUsuario());

        return Ok(resultado);
    }
}
