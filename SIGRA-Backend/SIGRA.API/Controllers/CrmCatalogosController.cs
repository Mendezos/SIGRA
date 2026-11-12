using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Filters;

namespace SIGRA.API.Controllers;

// Módulo 9 (CRM y prospectos): catálogos de solo lectura que comparten todas las pantallas del CRM.
[ApiController]
[PermisoModulo(9)]
[Route("api/crm/catalogos")]
public class CrmCatalogosController(ICrmCatalogosFlujo flujo) : ControllerBase
{
    [HttpGet("empresas")]
    public async Task<ActionResult<List<CrmEmpresaDto>>> Empresas([FromQuery] string? texto, [FromQuery] string? tipo, [FromQuery] bool soloActivas = true) =>
        Ok(await flujo.ListarEmpresasAsync(texto, tipo, soloActivas));

    [HttpGet("empresas/{tipo}/{idEmpresa:int}/contactos")]
    public async Task<ActionResult<List<CrmContactoCatalogoDto>>> Contactos(string tipo, int idEmpresa, [FromQuery] bool soloActivos = true) =>
        Ok(await flujo.ListarContactosAsync(tipo, idEmpresa, soloActivos));

    [HttpGet("vendedores")]
    public async Task<ActionResult<List<VendedorDto>>> Vendedores() => Ok(await flujo.ListarVendedoresAsync());
}
