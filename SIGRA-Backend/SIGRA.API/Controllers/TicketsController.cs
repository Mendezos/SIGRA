using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;

namespace SIGRA.API.Controllers;

[ApiController, Authorize, Route("api/tickets")]
public class TicketsController(ITicketsFlujo flujo) : ControllerBase
{
    private int Usuario => User.ObtenerIdUsuario();
    [HttpGet] public Task<PaginaDto<TicketDetalleDto>> Listar([FromQuery] FiltroTicketsDto filtro) => flujo.ListarAsync(filtro, Usuario);
    [HttpGet("resumen")] public Task<ResumenTicketsDto> Resumen() => flujo.ResumenAsync(Usuario);
    [HttpGet("{id:int}")] public Task<TicketDetalleDto> Detalle(int id) => flujo.ObtenerAsync(id, Usuario);
    [HttpGet("seguimiento/{codigo}")] public Task<SeguimientoTicketDto> Seguimiento(string codigo) => flujo.SeguimientoAsync(codigo, Usuario);
    [HttpGet("seguimiento-cliente")] public Task<List<SeguimientoTicketDto>> SeguimientoCliente([FromQuery] string empresa) => flujo.SeguimientoClienteAsync(empresa, Usuario);
    [HttpGet("clientes")] public Task<List<ClienteTicketDto>> Clientes([FromQuery] string? texto) => flujo.ClientesAsync(texto, Usuario);
    [HttpGet("tecnicos")] public Task<List<TecnicoTicketDto>> Tecnicos() => flujo.TecnicosAsync(Usuario);
    [HttpGet("configuracion")] public Task<ConfiguracionTicketsDto> Configuracion() => flujo.ConfiguracionAsync(Usuario);
    [HttpPut("configuracion")] public async Task<IActionResult> Configurar(ConfiguracionTicketsDto dto) { await flujo.GuardarConfiguracionAsync(dto, Usuario); return NoContent(); }
    [HttpPut("tecnicos/{id:int}/especialidades")] public async Task<IActionResult> Especialidades(int id, EspecialidadesTecnicoDto dto) { await flujo.GuardarEspecialidadesAsync(id, dto, Usuario); return NoContent(); }
    [HttpPost] public async Task<IActionResult> Registrar(RegistrarTicketDto dto)
    { var ticket = await flujo.RegistrarAsync(dto, Usuario); return CreatedAtAction(nameof(Detalle), new { id = ticket.IdTicket }, ticket); }
    [HttpPut("{id:int}")] public Task<TicketDetalleDto> Editar(int id, EditarTicketDto dto) => flujo.EditarAsync(id, dto, Usuario);
    [HttpPost("{id:int}/recepcion-fisica")] public Task<TicketDetalleDto> Recibir(int id, VersionTicketDto dto) => flujo.RecibirAsync(id, dto, Usuario);
    [HttpPost("{id:int}/asignacion")] public Task<TicketDetalleDto> Asignar(int id, AsignarTicketDto dto) => flujo.AsignarAsync(id, dto, Usuario);
    [HttpPost("{id:int}/iniciar")] public Task<TicketDetalleDto> Iniciar(int id, VersionTicketDto dto) => flujo.IniciarAsync(id, dto, Usuario);
    [HttpPost("{id:int}/cancelar")] public Task<TicketDetalleDto> Cancelar(int id, MotivoTicketDto dto) => flujo.CancelarAsync(id, dto, Usuario);
    [HttpPut("{id:int}/trabajo")] public Task<TicketDetalleDto> Trabajo(int id, GuardarTrabajoTicketDto dto) => flujo.GuardarTrabajoAsync(id, dto, Usuario);
    [HttpPost("{id:int}/derivar-reparacion")] public Task<TicketDetalleDto> Derivar(int id, VersionTicketDto dto) => flujo.DerivarReparacionAsync(id, dto, Usuario);
    [HttpPost("{id:int}/factura")] public Task<TicketDetalleDto> Factura(int id, ReferenciaFacturaDto dto) => flujo.RegistrarFacturaAsync(id, dto, Usuario);
    [HttpPost("{id:int}/cerrar")] public Task<TicketDetalleDto> Cerrar(int id, GuardarTrabajoTicketDto dto) => flujo.CerrarAsync(id, dto, Usuario);
    [HttpPost("{id:int}/inactivar")] public Task<TicketDetalleDto> Inactivar(int id, MotivoTicketDto dto) => flujo.InactivarAsync(id, dto, Usuario);
    [HttpDelete("{id:int}")] public IActionResult Eliminar(int id) => throw new ReglaNegocioException("Las boletas no se eliminan físicamente. Utilizá la inactivación con motivo cuando corresponda.");
    [HttpGet("historial")] public Task<List<HistorialTicketDto>> Historial([FromQuery] FiltroHistorialTicketsDto filtro) => flujo.HistorialAsync(filtro, Usuario);
    [HttpGet("indicadores")] public Task<IndicadoresTicketsDto> Indicadores([FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta) => flujo.IndicadoresAsync(desde, hasta, Usuario);
    [HttpGet("auditoria/responsables")] public Task<List<ResponsableAuditoriaTicketDto>> ResponsablesAuditoria() => flujo.ResponsablesAuditoriaAsync(Usuario);
    [HttpGet("auditoria")] public Task<List<AuditoriaTicketDto>> Auditoria([FromQuery] FiltroAuditoriaTicketsDto filtro) => flujo.AuditoriaAsync(filtro, Usuario);
    [HttpGet("garantias")] public Task<List<GarantiaTicketDto>> Garantias([FromQuery] FiltroGarantiasDto filtro) => flujo.GarantiasAsync(filtro, Usuario);
    [HttpPost("garantias/{id:long}/seguimiento")] public async Task<IActionResult> SeguimientoGarantia(long id, AgregarSeguimientoGarantiaDto dto)
    { await flujo.AgregarSeguimientoAsync(id, dto, Usuario); return NoContent(); }
    [HttpPut("garantias/{id:long}"), HttpDelete("garantias/{id:long}")]
    public IActionResult GarantiaSoloLectura(long id) => throw new ReglaNegocioException("El registro original de garantía es de solo lectura. Agregá una entrada de seguimiento.");
    [HttpGet("{id:int}/comprobante")] public async Task<IActionResult> Comprobante(int id)
    { var archivo = await flujo.ComprobanteAsync(id, Usuario); return File(archivo.Contenido, archivo.TipoContenido, archivo.Nombre); }
    [HttpPost("{id:int}/comprobante/enviar")] public async Task<IActionResult> Enviar(int id, EnviarComprobanteDto dto)
    { await flujo.EnviarComprobanteAsync(id, dto, Usuario); return Ok(new { mensaje = "El comprobante se envió correctamente." }); }
    [HttpGet("historial/exportar")] public async Task<IActionResult> ExportarHistorial([FromQuery] FiltroHistorialTicketsDto filtro, [FromQuery] string formato = "pdf")
    { var archivo = await flujo.ExportarHistorialAsync(filtro, formato, Usuario); return File(archivo.Contenido, archivo.TipoContenido, archivo.Nombre); }
    [HttpGet("garantias/exportar")] public async Task<IActionResult> ExportarGarantias([FromQuery] FiltroGarantiasDto filtro, [FromQuery] string formato = "pdf")
    { var archivo = await flujo.ExportarGarantiasAsync(filtro, formato, Usuario); return File(archivo.Contenido, archivo.TipoContenido, archivo.Nombre); }
}
