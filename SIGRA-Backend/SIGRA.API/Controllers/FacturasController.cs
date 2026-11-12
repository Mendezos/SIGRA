using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;

namespace SIGRA.API.Controllers;

[ApiController]
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
