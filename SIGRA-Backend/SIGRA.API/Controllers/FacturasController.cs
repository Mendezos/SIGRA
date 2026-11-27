using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;
using SIGRA.API.Filters;

namespace SIGRA.API.Controllers;

// Módulo 7 (Contratos y facturación): se exige el permiso del rol (GET lectura, POST escritura, PUT/PATCH edición).
[ApiController]
[PermisoModulo(7)]
[Route("api/facturas")]
public class FacturasController(IFacturaFlujo flujo) : ControllerBase
{
    [HttpPost]
    public Task<FacturaDto> Registrar(RegistrarFacturaDto dto) =>
        flujo.RegistrarAsync(dto, User.ObtenerIdUsuario());

    [HttpGet]
    public Task<List<FacturaDto>> Listar() => flujo.ListarAsync();

    [HttpPatch("{idFactura:int}/estado-cobro")]
    public Task<FacturaDto> CambiarEstadoCobro(
        int idFactura,
        CambiarEstadoCobroDto dto) =>
        flujo.CambiarEstadoCobroAsync(idFactura, dto, User.ObtenerIdUsuario());
}
