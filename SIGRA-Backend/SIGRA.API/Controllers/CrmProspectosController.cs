using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;
using SIGRA.API.Filters;

namespace SIGRA.API.Controllers;

// Módulo 9 (CRM y prospectos) - CRMGPSC-001 a 007: prospectos y contactos de empresa.
// Lo que cada rol puede leer, crear, editar o eliminar sale de "Roles y permisos" (GET=Lectura, POST=Escritura, PUT/PATCH=Edición, DELETE=Eliminación).
[ApiController]
[PermisoModulo(9)]
[Route("api/crm")]
public class CrmProspectosController(ICrmProspectosFlujo flujo) : ControllerBase
{
    // ---------- Prospectos ----------
    [HttpGet("prospectos")]
    public async Task<ActionResult<List<ProspectoDto>>> Prospectos([FromQuery] string? empresa, [FromQuery] string? sector, [FromQuery] string? fuente,
        [FromQuery] string? estado, [FromQuery] int? idVendedor, [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta) =>
        Ok(await flujo.ListarProspectosAsync(empresa, sector, fuente, estado, idVendedor, desde, hasta));

    [HttpGet("prospectos/{idProspecto:int}")]
    public async Task<ActionResult<ProspectoDetalleDto>> Prospecto(int idProspecto) =>
        Ok(await flujo.ObtenerDetalleProspectoAsync(idProspecto, User.ObtenerIdUsuario()));

    // Responde 200 siempre: con requiereConfirmacion = true cuando hay coincidencias y todavía no se confirmó el duplicado.
    [HttpPost("prospectos")]
    public async Task<ActionResult<RegistrarProspectoResultadoDto>> RegistrarProspecto([FromBody] RegistrarProspectoDto dto) =>
        Ok(await flujo.RegistrarProspectoAsync(dto, User.ObtenerIdUsuario()));

    [HttpPut("prospectos/{idProspecto:int}")]
    public async Task<ActionResult<ProspectoDto>> EditarProspecto(int idProspecto, [FromBody] EditarProspectoDto dto) =>
        Ok(await flujo.EditarProspectoAsync(idProspecto, dto, User.ObtenerIdUsuario()));

    // Si el prospecto ya está convertido en cliente responde 409 con { resultado: "Rechazado", idCliente, mensaje }.
    [HttpPatch("prospectos/{idProspecto:int}/descartar")]
    public async Task<ActionResult<ProspectoAccionResultadoDto>> DescartarProspecto(int idProspecto, [FromBody] DescartarProspectoDto dto) =>
        Responder(await flujo.DescartarProspectoAsync(idProspecto, dto, User.ObtenerIdUsuario()));

    [HttpPatch("prospectos/{idProspecto:int}/reactivar")]
    public async Task<ActionResult<ProspectoAccionResultadoDto>> ReactivarProspecto(int idProspecto, [FromBody] ReactivarProspectoDto dto) =>
        Responder(await flujo.ReactivarProspectoAsync(idProspecto, dto, User.ObtenerIdUsuario()));

    // ---------- Contactos de empresa ----------
    [HttpGet("contactos")]
    public async Task<ActionResult<List<ContactoEmpresaDto>>> Contactos([FromQuery] string? tipo, [FromQuery] int? idEmpresa, [FromQuery] string? texto, [FromQuery] string? estado) =>
        Ok(await flujo.ListarContactosAsync(tipo, idEmpresa, texto, estado));

    [HttpGet("contactos/{idContacto:int}")]
    public async Task<ActionResult<ContactoEmpresaDto>> Contacto(int idContacto) =>
        Ok(await flujo.ObtenerContactoAsync(idContacto));

    // Responde 200 con resultado = Guardado | RequiereConfirmacion (cambio de contacto principal) | Duplicado (ya existe en la empresa).
    [HttpPost("contactos")]
    public async Task<ActionResult<GuardarContactoResultadoDto>> RegistrarContacto([FromBody] RegistrarContactoEmpresaDto dto) =>
        Ok(await flujo.RegistrarContactoAsync(dto, User.ObtenerIdUsuario()));

    [HttpPut("contactos/{idContacto:int}")]
    public async Task<ActionResult<GuardarContactoResultadoDto>> EditarContacto(int idContacto, [FromBody] EditarContactoEmpresaDto dto) =>
        Ok(await flujo.EditarContactoAsync(idContacto, dto, User.ObtenerIdUsuario()));

    [HttpPatch("contactos/{idContacto:int}/desactivar")]
    public async Task<ActionResult<ContactoAccionResultadoDto>> DesactivarContacto(int idContacto, [FromBody] DesactivarContactoDto dto) =>
        Ok(await flujo.DesactivarContactoAsync(idContacto, dto, User.ObtenerIdUsuario()));

    [HttpPatch("contactos/{idContacto:int}/reactivar")]
    public async Task<ActionResult<ContactoAccionResultadoDto>> ReactivarContacto(int idContacto) =>
        Ok(await flujo.ReactivarContactoAsync(idContacto, User.ObtenerIdUsuario()));

    private ActionResult<ProspectoAccionResultadoDto> Responder(ProspectoAccionResultadoDto resultado) =>
        resultado.Resultado == ResultadosProspecto.Rechazado ? Conflict(resultado) : Ok(resultado);
}
