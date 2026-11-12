using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;
using SIGRA.API.Filters;

namespace SIGRA.API.Controllers;

// Módulo 9 (CRM y prospectos) - CRMGPSC-015 a 018 y 024: seguimientos, agenda y contactos periódicos.
// Lo que cada rol puede leer, crear, editar o eliminar sale de "Roles y permisos" (GET=Lectura, POST=Escritura, PUT/PATCH=Edición, DELETE=Eliminación).
// Programar un seguimiento o una serie es POST (Escritura); reprogramar, completar y cancelar un seguimiento son PUT (Edición).
// Quien no es el responsable del seguimiento solo puede consultarlo: el Administrador puede actuar sobre cualquiera.
[ApiController]
[PermisoModulo(9)]
[Route("api/crm")]
public class CrmSeguimientosController(ICrmSeguimientosFlujo flujo) : ControllerBase
{
    private const string RolAdministrador = "Administrador del sistema";

    private bool EsAdministrador => User.TieneRol(RolAdministrador);

    // ---------- Seguimientos y agenda ----------
    [HttpGet("seguimientos")]
    public async Task<ActionResult<List<CrmSeguimientoDto>>> Agenda([FromQuery] CrmAgendaConsultaDto consulta) =>
        Ok(await flujo.ListarAgendaAsync(consulta, User.ObtenerIdUsuario()));

    [HttpGet("seguimientos/{idSeguimiento:int}")]
    public async Task<ActionResult<CrmSeguimientoDto>> Seguimiento(int idSeguimiento) =>
        Ok(await flujo.ObtenerSeguimientoAsync(idSeguimiento));

    [HttpPost("seguimientos")]
    public async Task<ActionResult<CrmSeguimientoDto>> Crear([FromBody] CrearSeguimientoDto dto) =>
        Ok(await flujo.CrearSeguimientoAsync(dto, User.ObtenerIdUsuario()));

    [HttpPut("seguimientos/{idSeguimiento:int}/reprogramar")]
    public async Task<ActionResult<CrmSeguimientoAccionDto>> Reprogramar(int idSeguimiento, [FromBody] ReprogramarSeguimientoDto dto) =>
        Ok(await flujo.ReprogramarAsync(idSeguimiento, dto, User.ObtenerIdUsuario(), EsAdministrador));

    [HttpPut("seguimientos/{idSeguimiento:int}/completar")]
    public async Task<ActionResult<CrmSeguimientoAccionDto>> Completar(int idSeguimiento, [FromBody] CompletarSeguimientoDto dto) =>
        Ok(await flujo.CompletarAsync(idSeguimiento, dto, User.ObtenerIdUsuario(), EsAdministrador));

    [HttpPut("seguimientos/{idSeguimiento:int}/cancelar")]
    public async Task<ActionResult<CrmSeguimientoAccionDto>> Cancelar(int idSeguimiento, [FromBody] CancelarSeguimientoDto dto) =>
        Ok(await flujo.CancelarAsync(idSeguimiento, dto, User.ObtenerIdUsuario(), EsAdministrador));

    // ---------- Contactos periódicos ----------
    [HttpGet("series")]
    public async Task<ActionResult<List<CrmSerieDto>>> Series([FromQuery] CrmSerieFiltroDto filtro) =>
        Ok(await flujo.ListarSeriesAsync(filtro));

    [HttpGet("series/{idSerie:int}")]
    public async Task<ActionResult<CrmSerieDetalleDto>> Serie(int idSerie) =>
        Ok(await flujo.ObtenerSerieAsync(idSerie));

    [HttpPost("series")]
    public async Task<ActionResult<CrmSerieDetalleDto>> CrearSerie([FromBody] CrearSerieDto dto) =>
        Ok(await flujo.CrearSerieAsync(dto, User.ObtenerIdUsuario()));

    [HttpPost("series/{idSerie:int}/cancelar")]
    public async Task<ActionResult<CrmSerieAccionDto>> CancelarSerie(int idSerie, [FromBody] CancelarSerieDto dto) =>
        Ok(await flujo.CancelarSerieAsync(idSerie, dto, User.ObtenerIdUsuario(), EsAdministrador));
}
