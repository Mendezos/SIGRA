using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;
using System.Globalization;

namespace SIGRA.API.Controllers;

[ApiController]
[Route("api/frecuencias")]
public class FrecuenciasController : ControllerBase
{
    private const string RolAdministrador = "Administrador del sistema";
    private const string RolVendedor = "Vendedor / Ejecutivo de cuenta";
    private const string RolesRegistro = RolAdministrador + "," + RolVendedor;
    private const string RolesLectura = RolesRegistro + ",Gerente";
    // Margen sobre los 10 MB permitidos por archivo para que la validación del sistema (y su mensaje) responda antes que el servidor.
    private const string MensajeAuditoriaRestringida =
        "Acceso denegado: la bitácora de auditoría completa solo está disponible para el Administrador. " +
        "Puede consultar el historial de renovaciones de sus propias solicitudes.";
    private const string MensajeAuditoriaSoloLectura =
        "La bitácora de auditoría es de solo lectura: sus eventos no se pueden modificar ni eliminar, para preservar la trazabilidad.";
    private const long LimiteSolicitudBytes = 100 * 1024 * 1024;

    private readonly IFrecuenciaFlujo _flujo;

    public FrecuenciasController(IFrecuenciaFlujo flujo) => _flujo = flujo;

    // El vendedor solo trabaja con las solicitudes que tiene asignadas; administrador y gerente ven todas.
    private int? VendedorRestringido => User.IsInRole(RolVendedor) ? User.ObtenerIdUsuario() : null;

    // ---------- Catálogos para el formulario (RCFR-001) ----------
    [HttpGet("clientes")]
    [Authorize(Roles = RolesRegistro)]
    public async Task<ActionResult<List<ClienteDto>>> Clientes() => Ok(await _flujo.ListarClientesAsync());

    [HttpGet("clientes/{idCliente:int}/repetidoras")]
    [Authorize(Roles = RolesRegistro)]
    public async Task<ActionResult<List<RepetidoraClienteDto>>> RepetidorasDeCliente(int idCliente) =>
        Ok(await _flujo.ListarRepetidorasDeClienteAsync(idCliente));

    [HttpGet("vendedores")]
    [Authorize(Roles = RolAdministrador + ",Gerente")]
    public async Task<ActionResult<List<VendedorDto>>> Vendedores() => Ok(await _flujo.ListarVendedoresAsync());

    // ---------- Solicitudes de frecuencia ----------
    [HttpGet("solicitudes")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<SolicitudFrecuenciaDto>>> Solicitudes(
        [FromQuery] string? texto, [FromQuery] string? estado, [FromQuery] string? cliente, [FromQuery] string? zona, [FromQuery] int? idVendedor) =>
        // El vendedor solo ve las suyas; administrador y gerente pueden filtrar por vendedor responsable.
        Ok(await _flujo.ListarSolicitudesAsync(texto, estado, cliente, zona, VendedorRestringido ?? idVendedor));

    [HttpGet("solicitudes/{idSolicitud:int}")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<SolicitudFrecuenciaDto>> Solicitud(int idSolicitud) =>
        Ok(await _flujo.ObtenerSolicitudAsync(idSolicitud, VendedorRestringido));

    [HttpPost("solicitudes")]
    [Authorize(Roles = RolesRegistro)]
    [RequestSizeLimit(LimiteSolicitudBytes)]
    public async Task<ActionResult<SolicitudFrecuenciaDto>> RegistrarSolicitud([FromForm] RegistrarSolicitudFormulario formulario)
    {
        var dto = new RegistrarSolicitudDto
        {
            IdCliente = formulario.IdCliente,
            IdEquipo = formulario.IdEquipo,
            IdVendedor = formulario.IdVendedor,
            Frecuencia = formulario.Frecuencia,
            Banda = formulario.Banda,
            Potencia = formulario.Potencia,
            ZonaCobertura = formulario.ZonaCobertura,
            FechaPresentacion = ConvertirFecha(formulario.FechaPresentacion),
            IdSolicitudOrigen = formulario.IdSolicitudOrigen
        };

        foreach (var archivo in formulario.Formularios ?? new List<IFormFile>())
            dto.Documentos.Add(await LeerArchivoAsync(archivo, "Formulario presentado"));
        foreach (var archivo in formulario.Acuses ?? new List<IFormFile>())
            dto.Documentos.Add(await LeerArchivoAsync(archivo, "Acuse de recibo"));

        return Ok(await _flujo.RegistrarSolicitudAsync(dto, VendedorRestringido, User.ObtenerIdUsuario()));
    }

    // Bitácora de auditoría completa de la solicitud (RCFR-010): solo el Administrador. El vendedor conserva únicamente
    // el historial de renovaciones de sus propias solicitudes (ver más abajo).
    [HttpGet("solicitudes/{idSolicitud:int}/auditoria")]
    [Authorize(Roles = RolesLectura)]
    public async Task<IActionResult> Auditoria(int idSolicitud)
    {
        if (!User.IsInRole(RolAdministrador))
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = MensajeAuditoriaRestringida });

        return Ok(await _flujo.ObtenerAuditoriaAsync(idSolicitud));
    }

    // La bitácora no se puede editar ni eliminar, ni siquiera por el Administrador (además de este rechazo, la base de
    // datos lo impide con un trigger).
    [HttpPut("solicitudes/{idSolicitud:int}/auditoria/{idAuditoria:long}")]
    [HttpDelete("solicitudes/{idSolicitud:int}/auditoria/{idAuditoria:long}")]
    [Authorize]
    public IActionResult AuditoriaSoloLectura(int idSolicitud, long idAuditoria) =>
        StatusCode(StatusCodes.Status405MethodNotAllowed, new { mensaje = MensajeAuditoriaSoloLectura });

    // Historial de ciclos (solicitud original y renovaciones) de la frecuencia, en orden cronológico (RCFR-004).
    [HttpGet("solicitudes/{idSolicitud:int}/historial")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<CicloFrecuenciaDto>>> Historial(int idSolicitud) =>
        Ok(await _flujo.ObtenerHistorialAsync(idSolicitud, VendedorRestringido));

    // ---------- Cancelación de la solicitud (RCFR-005) ----------
    [HttpPost("solicitudes/{idSolicitud:int}/cancelacion")]
    [Authorize(Roles = RolesRegistro)]
    public async Task<ActionResult<SolicitudFrecuenciaDto>> Cancelar(int idSolicitud, [FromBody] CancelarSolicitudDto dto) =>
        Ok(await _flujo.CancelarSolicitudAsync(idSolicitud, dto, VendedorRestringido, User.ObtenerIdUsuario()));

    // ---------- Otorgamiento de la frecuencia (RCFR-002) ----------
    [HttpPost("solicitudes/{idSolicitud:int}/otorgamiento")]
    [Authorize(Roles = RolesRegistro)]
    public async Task<ActionResult<SolicitudFrecuenciaDto>> Otorgar(int idSolicitud, [FromBody] OtorgarFrecuenciaDto dto) =>
        Ok(await _flujo.OtorgarSolicitudAsync(idSolicitud, dto, VendedorRestringido, User.ObtenerIdUsuario()));

    // ---------- Alertas de vencimiento (RCFR-003) ----------
    [HttpGet("alertas")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<AlertaFrecuenciaDto>>> Alertas([FromQuery] bool? atendida) =>
        Ok(await _flujo.ListarAlertasAsync(atendida, VendedorRestringido));

    [HttpPost("alertas/{idAlerta:int}/atender")]
    [Authorize(Roles = RolesRegistro)]
    public async Task<ActionResult<AlertaFrecuenciaDto>> AtenderAlerta(int idAlerta, [FromBody] AtenderAlertaDto dto) =>
        Ok(await _flujo.AtenderAlertaAsync(idAlerta, dto, VendedorRestringido, User.ObtenerIdUsuario()));

    // Ejecuta a demanda la misma verificación que corre sola en segundo plano.
    [HttpPost("alertas/verificar")]
    [Authorize(Roles = RolAdministrador)]
    public async Task<ActionResult<ResultadoVerificacionDto>> VerificarAlertas() => Ok(await _flujo.ProcesarAlertasAsync(reintentarTodos: true));

    // Indicadores del dashboard administrativo.
    [HttpGet("resumen")]
    [Authorize(Roles = RolAdministrador + ",Gerente")]
    public async Task<ActionResult<ResumenFrecuenciasDto>> Resumen() => Ok(await _flujo.ObtenerResumenAsync());

    // ---------- Documentos de la solicitud ----------
    [HttpGet("solicitudes/{idSolicitud:int}/documentos")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<DocumentoSolicitudDto>>> Documentos(int idSolicitud) =>
        Ok(await _flujo.ListarDocumentosAsync(idSolicitud, VendedorRestringido));

    [HttpPost("solicitudes/{idSolicitud:int}/documentos")]
    [Authorize(Roles = RolesRegistro)]
    [RequestSizeLimit(LimiteSolicitudBytes)]
    public async Task<ActionResult<DocumentoSolicitudDto>> AdjuntarDocumento(int idSolicitud, [FromForm] SubirDocumentoSolicitudFormulario formulario)
    {
        var dto = formulario.Archivo is null
            ? new SubirDocumentoDto()
            : await LeerArchivoAsync(formulario.Archivo, formulario.TipoDocumento);
        dto.NombreDocumento = formulario.NombreDocumento;

        return Ok(await _flujo.AdjuntarDocumentoAsync(idSolicitud, dto, VendedorRestringido, User.ObtenerIdUsuario()));
    }

    [HttpGet("solicitudes/documentos/{idDocumento:int}/archivo")]
    [Authorize(Roles = RolesLectura)]
    public async Task<IActionResult> DescargarDocumento(int idDocumento, [FromQuery] bool descargar = true)
    {
        var documento = await _flujo.ObtenerDocumentoAsync(idDocumento, VendedorRestringido);
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return descargar
            ? File(documento.Contenido, documento.TipoContenido, documento.NombreArchivo)
            : File(documento.Contenido, documento.TipoContenido);
    }

    private static async Task<SubirDocumentoDto> LeerArchivoAsync(IFormFile archivo, string? tipoDocumento)
    {
        using var memoria = new MemoryStream();
        await archivo.CopyToAsync(memoria);
        return new SubirDocumentoDto { NombreArchivo = archivo.FileName, Contenido = memoria.ToArray(), TipoDocumento = tipoDocumento };
    }

    private static DateTime? ConvertirFecha(string? texto)
    {
        if (string.IsNullOrWhiteSpace(texto))
            return null;

        if (!DateTime.TryParseExact(texto.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fecha))
            throw new ReglaNegocioException("La fecha de presentación del trámite no es válida.");

        return fecha;
    }
}

// Formularios multipart (clases propias para que Swagger pueda describir los archivos).
public class RegistrarSolicitudFormulario
{
    public int? IdCliente { get; set; }
    public int? IdEquipo { get; set; }
    public int? IdVendedor { get; set; }
    public string? Frecuencia { get; set; }
    public string? Banda { get; set; }
    public string? Potencia { get; set; }
    public string? ZonaCobertura { get; set; }
    public string? FechaPresentacion { get; set; }
    public int? IdSolicitudOrigen { get; set; }
    public List<IFormFile>? Formularios { get; set; }
    public List<IFormFile>? Acuses { get; set; }
}

public class SubirDocumentoSolicitudFormulario
{
    public IFormFile? Archivo { get; set; }
    public string? TipoDocumento { get; set; }
    public string? NombreDocumento { get; set; }
}
