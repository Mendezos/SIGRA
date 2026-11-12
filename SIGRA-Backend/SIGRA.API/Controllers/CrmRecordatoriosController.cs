using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;
using SIGRA.API.Filters;

namespace SIGRA.API.Controllers;

// Módulo 9 (CRM y prospectos) - CRMGPSC-025 y T-02: recordatorios de baterías y servicio de recordatorios.
// Lo que cada rol puede leer, crear, editar o eliminar sale de "Roles y permisos" (GET=Lectura, POST=Escritura, PUT/PATCH=Edición, DELETE=Eliminación).
[ApiController]
[PermisoModulo(9)]
[Route("api/crm")]
public class CrmRecordatoriosController(ICrmRecordatoriosFlujo flujo) : ControllerBase
{
    private const string RolAdministrador = "Administrador del sistema";

    // ---------- Recordatorios de baterías (CRMGPSC-025) ----------
    [HttpGet("baterias/modelos")]
    public async Task<ActionResult<List<BateriaModeloDto>>> Modelos() => Ok(await flujo.ListarModelosAsync());

    [HttpGet("baterias")]
    public async Task<ActionResult<List<RecordatorioBateriaDto>>> Listar(
        [FromQuery] string? estado, [FromQuery] int? idVendedor, [FromQuery] string? cliente, [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta) =>
        Ok(await flujo.ListarAsync(estado, idVendedor, cliente, desde, hasta));

    [HttpGet("baterias/{idRecordatorio:int}")]
    public async Task<ActionResult<RecordatorioBateriaDto>> Obtener(int idRecordatorio) => Ok(await flujo.ObtenerAsync(idRecordatorio));

    [HttpPost("baterias")]
    public async Task<ActionResult<BateriaRegistroResultadoDto>> Registrar([FromBody] RegistrarCompraBateriaDto dto) =>
        Ok(await flujo.RegistrarAsync(dto, User.ObtenerIdUsuario()));

    [HttpPost("baterias/{idRecordatorio:int}/atender")]
    public async Task<ActionResult<BateriaAtencionResultadoDto>> Atender(int idRecordatorio, [FromBody] AtenderBateriaDto dto) =>
        Ok(await flujo.AtenderAsync(idRecordatorio, dto, User.ObtenerIdUsuario()));

    // ---------- Servicio de recordatorios (T-02) ----------
    // Contadores para el tablero del vendedor: baterías por atender y seguimientos atrasados del usuario.
    [HttpGet("recordatorios/resumen")]
    public async Task<ActionResult<ResumenRecordatoriosDto>> Resumen() => Ok(await flujo.ObtenerResumenAsync(User.ObtenerIdUsuario()));

    // Dispara a mano la misma vuelta que corre sola en segundo plano (solo el Administrador).
    [HttpPost("recordatorios/procesar")]
    [RolesPermitidos(RolAdministrador)]
    public async Task<ActionResult<ResumenProcesoRecordatoriosDto>> Procesar() => Ok(await flujo.ProcesarAsync(User.ObtenerIdUsuario()));
}
