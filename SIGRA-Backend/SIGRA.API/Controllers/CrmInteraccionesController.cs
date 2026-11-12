using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;
using SIGRA.API.Filters;

namespace SIGRA.API.Controllers;

// Módulo 9 (CRM y prospectos) - CRMGPSC-013 y 014: notas, interacciones e historial comercial.
// Lo que cada rol puede leer, crear, editar o eliminar sale de "Roles y permisos" (GET=Lectura, POST=Escritura, PUT/PATCH=Edición, DELETE=Eliminación).
[ApiController]
[PermisoModulo(9)]
[Route("api/crm")]
public class CrmInteraccionesController(ICrmInteraccionesFlujo flujo) : ControllerBase
{
    // ---------- CRMGPSC-013: registrar interacciones y notas ----------
    [HttpPost("interacciones")]
    public async Task<ActionResult<InteraccionRegistradaDto>> RegistrarInteraccion([FromBody] RegistrarInteraccionDto dto) =>
        Ok(await flujo.RegistrarInteraccionAsync(dto, User.ObtenerIdUsuario()));

    [HttpPost("notas")]
    public async Task<ActionResult<NotaRegistradaDto>> RegistrarNota([FromBody] RegistrarNotaDto dto) =>
        Ok(await flujo.RegistrarNotaAsync(dto, User.ObtenerIdUsuario()));

    // Cotizaciones de la empresa, para relacionarlas con la interacción.
    [HttpGet("interacciones/cotizaciones")]
    public async Task<ActionResult<List<CrmCotizacionEmpresaDto>>> Cotizaciones([FromQuery] string? tipoEmpresa, [FromQuery] int? idEmpresa) =>
        Ok(await flujo.ListarCotizacionesAsync(tipoEmpresa, idEmpresa));

    // ---------- CRMGPSC-014: historial comercial ----------
    // Línea de tiempo (interacciones, notas según su visibilidad y cotizaciones) de más reciente a más antigua.
    [HttpGet("historial")]
    public async Task<ActionResult<HistorialComercialDto>> Historial(
        [FromQuery] string? tipoEmpresa, [FromQuery] int? idEmpresa, [FromQuery] string? tipoMovimiento,
        [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta, [FromQuery] int? idAutor) =>
        Ok(await flujo.ObtenerHistorialAsync(tipoEmpresa, idEmpresa, tipoMovimiento, desde, hasta, idAutor, User.ObtenerIdUsuario()));
}
