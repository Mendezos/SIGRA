using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
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
    // Margen sobre los 10 MB permitidos para que la validación del sistema (y su mensaje) responda antes que el servidor.
    private const long LimiteSolicitudBytes = 50 * 1024 * 1024;

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

    // ---------- Radios en alquiler ----------
    [HttpGet("radios")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<RadioDto>>> Radios([FromQuery] string? texto) =>
        Ok(await _flujo.ListarRadiosAsync(texto));

    [HttpGet("radios/serie/{numeroSerie}")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<RadioDto>> RadioPorSerie(string numeroSerie) =>
        Ok(await _flujo.ObtenerRadioPorSerieAsync(numeroSerie));

    [HttpPost("radios")]
    [Authorize(Roles = RolesRadios)]
    public async Task<ActionResult<DetalleContratoDto>> AgregarRadio([FromBody] AgregarRadioDto dto) =>
        Ok(await _flujo.AgregarRadioAContratoAsync(dto, User.ObtenerIdUsuario()));

    // ---------- Fichas técnicas de repetidoras (CARR-009) ----------
    [HttpGet("repetidoras")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<RepetidoraDto>>> Repetidoras([FromQuery] string? texto, [FromQuery] bool? facturable) =>
        Ok(await _flujo.ListarRepetidorasAsync(texto, facturable));

    [HttpGet("repetidoras/serie/{numeroSerie}")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<RepetidoraDto>> RepetidoraPorSerie(string numeroSerie) =>
        Ok(await _flujo.ObtenerRepetidoraPorSerieAsync(numeroSerie));

    [HttpPost("repetidoras/ficha")]
    [Authorize(Roles = RolesRadios)]
    public async Task<ActionResult<RepetidoraDto>> RegistrarFichaRepetidora([FromBody] GuardarFichaRepetidoraDto dto) =>
        Ok(await _flujo.GuardarFichaRepetidoraAsync(dto, false, User.ObtenerIdUsuario()));

    [HttpPut("repetidoras/ficha")]
    [Authorize(Roles = RolesRadios)]
    public async Task<ActionResult<RepetidoraDto>> ActualizarFichaRepetidora([FromBody] GuardarFichaRepetidoraDto dto) =>
        Ok(await _flujo.GuardarFichaRepetidoraAsync(dto, true, User.ObtenerIdUsuario()));

    // ---------- Checklist previo a la instalación (CARR-011) ----------
    [HttpGet("repetidoras/{numeroSerie}/checklist")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<ChecklistRepetidoraDto>> Checklist(string numeroSerie) =>
        Ok(await _flujo.ObtenerChecklistAsync(numeroSerie));

    [HttpPost("repetidoras/{numeroSerie}/checklist")]
    [Authorize(Roles = RolesRadios)]
    public async Task<ActionResult<ChecklistRepetidoraDto>> GuardarChecklist(string numeroSerie, [FromBody] GuardarChecklistDto dto) =>
        Ok(await _flujo.GuardarChecklistAsync(numeroSerie, dto, User.ObtenerIdUsuario()));

    // ---------- Documentos técnicos de la repetidora (CARR-012) ----------
    [HttpGet("repetidoras/{numeroSerie}/documentos")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<DocumentoRepetidoraDto>>> Documentos(string numeroSerie) =>
        Ok(await _flujo.ListarDocumentosAsync(numeroSerie));

    [HttpPost("repetidoras/{numeroSerie}/documentos")]
    [Authorize(Roles = RolesRadios)]
    [RequestSizeLimit(LimiteSolicitudBytes)]
    public async Task<ActionResult<DocumentoRepetidoraDto>> AdjuntarDocumento(string numeroSerie, [FromForm] SubirDocumentoFormulario formulario)
    {
        byte[]? contenido = null;
        if (formulario.Archivo is not null)
        {
            using var memoria = new MemoryStream();
            await formulario.Archivo.CopyToAsync(memoria);
            contenido = memoria.ToArray();
        }

        var dto = new SubirDocumentoDto
        {
            NombreArchivo = formulario.Archivo?.FileName,
            Contenido = contenido,
            TipoDocumento = formulario.TipoDocumento,
            NombreDocumento = formulario.NombreDocumento
        };
        return Ok(await _flujo.AdjuntarDocumentoAsync(numeroSerie, dto, User.ObtenerIdUsuario()));
    }

    [HttpGet("repetidoras/documentos/{idDocumento:int}/archivo")]
    [Authorize(Roles = RolesLectura)]
    public async Task<IActionResult> DescargarDocumento(int idDocumento, [FromQuery] bool descargar = true)
    {
        var documento = await _flujo.ObtenerDocumentoAsync(idDocumento);
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return descargar
            ? File(documento.Contenido, documento.TipoContenido, documento.NombreArchivo)
            : File(documento.Contenido, documento.TipoContenido);
    }

    // ---------- Bitácora de mantenimiento de la repetidora (CARR-013) ----------
    [HttpGet("repetidoras/{numeroSerie}/bitacora")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<BitacoraMantenimientoDto>>> BitacoraRepetidora(string numeroSerie) =>
        Ok(await _flujo.ObtenerBitacoraRepetidoraAsync(numeroSerie));
}

// Formulario multipart de la carga de documentos (clase propia para que Swagger pueda describir el archivo).
public class SubirDocumentoFormulario
{
    public IFormFile? Archivo { get; set; }
    public string? TipoDocumento { get; set; }
    public string? NombreDocumento { get; set; }
}
