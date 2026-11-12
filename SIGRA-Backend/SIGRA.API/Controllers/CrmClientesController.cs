using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;
using SIGRA.API.Filters;

namespace SIGRA.API.Controllers;

// Módulo 9 (CRM y prospectos) - CRMGPSC-019 a 021: clientes, conversión de prospectos y responsable comercial.
[ApiController]
[PermisoModulo(9)]
[Route("api/crm")]
public class CrmClientesController(ICrmClientesFlujo flujo) : ControllerBase
{
    [HttpGet("clientes")]
    public async Task<ActionResult<List<ClienteCrmDto>>> Clientes([FromQuery] string? texto, [FromQuery] int? idVendedor, [FromQuery] string? estado) =>
        Ok(await flujo.ListarClientesAsync(texto, idVendedor, estado));

    [HttpGet("clientes/{idCliente:int}/perfil")]
    public async Task<ActionResult<PerfilClienteDto>> Perfil(int idCliente) =>
        Ok(await flujo.ObtenerPerfilAsync(idCliente, User.ObtenerIdUsuario()));

    [HttpPut("clientes/{idCliente:int}")]
    public async Task<IActionResult> Editar(int idCliente, [FromBody] EditarClienteDto dto)
    {
        await flujo.EditarAsync(idCliente, dto, User.ObtenerIdUsuario());
        return NoContent();
    }

    [HttpPatch("clientes/{idCliente:int}/estado")]
    public async Task<ActionResult<EstadoClienteResultadoDto>> CambiarEstado(
        int idCliente, [FromBody] CambiarEstadoClienteDto dto) =>
        Ok(await flujo.CambiarEstadoAsync(idCliente, dto, User.ObtenerIdUsuario()));

    // Responde 200 siempre: con resultado = RequiereVinculo cuando hay clientes que coinciden y todavía no se eligió uno.
    [HttpPost("prospectos/{idProspecto:int}/convertir")]
    public async Task<ActionResult<ConvertirProspectoResultadoDto>> Convertir(int idProspecto, [FromBody] ConvertirProspectoDto dto) =>
        Ok(await flujo.ConvertirProspectoAsync(idProspecto, dto, User.ObtenerIdUsuario()));

    [HttpPut("{tipo:regex(^(prospectos|clientes)$)}/{idEmpresa:int}/responsable")]
    public async Task<ActionResult<AsignarResponsableResultadoDto>> AsignarResponsable(string tipo, int idEmpresa, [FromBody] AsignarResponsableDto dto) =>
        Ok(await flujo.AsignarResponsableAsync(tipo, idEmpresa, dto, User.ObtenerIdUsuario()));
}
