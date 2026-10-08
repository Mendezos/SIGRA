using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;

namespace SIGRA.API.Controllers;

[ApiController]
[Route("api/alquiler")]
public class AlquilerController : ControllerBase
{
    private const string RolAdministrador = "Administrador del sistema";
    private const string RolVendedor = "Vendedor / Ejecutivo de cuenta";
    private const string RolesContactos = RolAdministrador + "," + RolVendedor;
    private const string RolesLectura = RolAdministrador + ",Gerente,Coordinador tecnico,Tecnico," + RolVendedor;
    private const string RolesRadios = RolAdministrador + ",Coordinador tecnico,Tecnico";

    private readonly IAlquilerFlujo _flujo;

    public AlquilerController(IAlquilerFlujo flujo) => _flujo = flujo;

    // ---------- Contactos iniciales ----------
    [HttpGet("vendedores")]
    [Authorize(Roles = RolesContactos)]
    public async Task<ActionResult<List<VendedorDto>>> Vendedores() => Ok(await _flujo.ListarVendedoresAsync());

    [HttpGet("contactos/sugerencia")]
    [Authorize(Roles = RolesContactos)]
    public async Task<ActionResult<SugerenciaContactoDto>> Sugerencia([FromQuery] string empresa) =>
        Ok(await _flujo.ObtenerSugerenciaContactoAsync(empresa));

    [HttpGet("contactos")]
    [Authorize(Roles = RolesContactos + ",Gerente")]
    public async Task<ActionResult<List<ContactoDto>>> Contactos()
    {
        // Cada vendedor solo ve los contactos que tiene asignados.
        int? idVendedor = User.IsInRole(RolVendedor) ? User.ObtenerIdUsuario() : null;
        return Ok(await _flujo.ListarContactosAsync(idVendedor));
    }

    [HttpGet("contactos/{idContacto:int}")]
    [Authorize(Roles = RolesContactos + ",Gerente")]
    public async Task<ActionResult<DetalleContactoDto>> Contacto(int idContacto) =>
        Ok(await _flujo.ObtenerContactoAsync(idContacto));

    [HttpPost("contactos")]
    [Authorize(Roles = RolesContactos)]
    public async Task<ActionResult<RegistrarContactoResultadoDto>> RegistrarContacto([FromBody] RegistrarContactoDto dto) =>
        Ok(await _flujo.RegistrarContactoAsync(dto, User.ObtenerIdUsuario()));

    [HttpPut("contactos/{idContacto:int}/vendedor")]
    [Authorize(Roles = RolAdministrador)]
    public async Task<ActionResult<DetalleContactoDto>> Reasignar(int idContacto, [FromBody] ReasignarContactoDto dto) =>
        Ok(await _flujo.ReasignarContactoAsync(idContacto, dto, User.ObtenerIdUsuario()));

    // ---------- Contratos ----------
    [HttpGet("clientes")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<ClienteDto>>> Clientes() => Ok(await _flujo.ListarClientesAsync());

    [HttpGet("equipos-disponibles")]
    [Authorize(Roles = RolesContactos)]
    public async Task<ActionResult<List<EquipoDisponibleDto>>> EquiposDisponibles() =>
        Ok(await _flujo.ListarEquiposParaContratoAsync());

    [HttpGet("contratos")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<ContratoDto>>> Contratos([FromQuery] string? texto, [FromQuery] string? estado) =>
        Ok(await _flujo.ListarContratosAsync(texto, estado));

    [HttpGet("contratos/{idContrato:int}")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<DetalleContratoDto>> Contrato(int idContrato) =>
        Ok(await _flujo.ObtenerContratoAsync(idContrato));

    [HttpPost("contratos")]
    [Authorize(Roles = RolesContactos)]
    public async Task<ActionResult<DetalleContratoDto>> RegistrarContrato([FromBody] RegistrarContratoDto dto)
    {
        var idUsuario = User.ObtenerIdUsuario();
        int? idVendedor = User.IsInRole(RolVendedor) ? idUsuario : null;
        return Ok(await _flujo.RegistrarContratoAsync(dto, idVendedor, idUsuario));
    }

    [HttpPost("contratos/{idContrato:int}/renovar")]
    [Authorize(Roles = RolesContactos)]
    public async Task<ActionResult<DetalleContratoDto>> Renovar(int idContrato, [FromBody] RenovarContratoDto dto) =>
        Ok(await _flujo.RenovarContratoAsync(idContrato, dto, User.ObtenerIdUsuario(), User.IsInRole(RolAdministrador)));

    [HttpPost("contratos/{idContrato:int}/cancelar")]
    [Authorize(Roles = RolAdministrador)]
    public async Task<ActionResult<DetalleContratoDto>> Cancelar(int idContrato, [FromBody] CancelarContratoDto dto) =>
        Ok(await _flujo.CancelarContratoAsync(idContrato, dto, User.ObtenerIdUsuario()));

    [HttpGet("contratos/{idContrato:int}/renovaciones")]
    [Authorize(Roles = RolesContactos)]
    public async Task<ActionResult<List<RenovacionDto>>> Renovaciones(int idContrato) =>
        Ok(await _flujo.ListarRenovacionesAsync(idContrato, User.ObtenerIdUsuario(), User.IsInRole(RolAdministrador)));

    // Bitácora completa del contrato: solo el Administrador, y solo de lectura.
    [HttpGet("contratos/{idContrato:int}/auditoria")]
    [Authorize(Roles = RolAdministrador)]
    public async Task<ActionResult<List<AuditoriaContratoDto>>> Auditoria(int idContrato) =>
        Ok(await _flujo.ListarAuditoriaContratoAsync(idContrato));

    [HttpPut("contratos/{idContrato:int}/auditoria/{idAuditoria:long}")]
    [HttpDelete("contratos/{idContrato:int}/auditoria/{idAuditoria:long}")]
    [Authorize(Roles = RolAdministrador)]
    public ActionResult AuditoriaSoloLectura(int idContrato, long idAuditoria) =>
        throw new ReglaNegocioException("La bitácora de auditoría es de solo lectura: sus eventos no se pueden editar ni eliminar.");

    // ---------- Radios en alquiler ----------
    [HttpGet("radios")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<RadioDto>>> Radios([FromQuery] string? texto) =>
        Ok(await _flujo.ListarRadiosAsync(texto));

    [HttpGet("radios/serie/{numeroSerie}")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<RadioDto>> RadioPorSerie(string numeroSerie) =>
        Ok(await _flujo.ObtenerRadioPorSerieAsync(numeroSerie));

    [HttpGet("radios/{idRadio:int}/baterias")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<CambioBateriaDto>>> Baterias(int idRadio) =>
        Ok(await _flujo.ListarBateriasAsync(idRadio));

    [HttpGet("baterias/alertas")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<RadioDto>>> BateriasPorCambiar() =>
        Ok(await _flujo.ListarRadiosConBateriaPorCambiarAsync());

    [HttpPost("radios/bateria")]
    [Authorize(Roles = RolesRadios)]
    public async Task<ActionResult<RadioDto>> CambiarBateria([FromBody] RegistrarBateriaDto dto) =>
        Ok(await _flujo.RegistrarCambioBateriaAsync(dto, User.ObtenerIdUsuario()));

    [HttpPost("radios")]
    [Authorize(Roles = RolesRadios)]
    public async Task<ActionResult<DetalleContratoDto>> AgregarRadio([FromBody] AgregarRadioDto dto) =>
        Ok(await _flujo.AgregarRadioAContratoAsync(dto, User.ObtenerIdUsuario()));
}
