using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;
using SIGRA.API.Filters;

namespace SIGRA.API.Controllers;

// Módulo 9 (CRM y prospectos) - CRMGPSC-026: historial de cambios del CRM para el administrador.
[ApiController]
[PermisoModulo(9)]
[Route("api/crm/auditoria")]
public class CrmAuditoriaController(ICrmAuditoriaFlujo flujo) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PaginaAuditoriaCrmDto>> Consultar([FromQuery] FiltroAuditoriaCrmDto filtro) =>
        Ok(await flujo.ConsultarAsync(filtro, User.ObtenerIdUsuario()));

    [HttpGet("{idAuditoria:long}")]
    public async Task<ActionResult<DetalleAuditoriaCrmDto>> Detalle(long idAuditoria) =>
        Ok(await flujo.ObtenerDetalleAsync(idAuditoria, User.ObtenerIdUsuario()));
}
