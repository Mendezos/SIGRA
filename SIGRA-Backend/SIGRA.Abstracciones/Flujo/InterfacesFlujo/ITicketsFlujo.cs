using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

public interface ITicketsFlujo
{
    Task<List<ResponsableAuditoriaTicketDto>> ResponsablesAuditoriaAsync(int idUsuario);
    Task<PaginaDto<TicketDetalleDto>> ListarAsync(FiltroTicketsDto filtro, int idUsuario);
    Task<ResumenTicketsDto> ResumenAsync(int idUsuario);
    Task<TicketDetalleDto> ObtenerAsync(int idTicket, int idUsuario);
    Task<SeguimientoTicketDto> SeguimientoAsync(string codigo, int idUsuario);
    Task<List<SeguimientoTicketDto>> SeguimientoClienteAsync(string empresa, int idUsuario);
    Task<List<ClienteTicketDto>> ClientesAsync(string? texto, int idUsuario);
    Task<List<TecnicoTicketDto>> TecnicosAsync(int idUsuario);
    Task<ConfiguracionTicketsDto> ConfiguracionAsync(int idUsuario);
    Task GuardarConfiguracionAsync(ConfiguracionTicketsDto dto, int idUsuario);
    Task GuardarEspecialidadesAsync(int idTecnico, EspecialidadesTecnicoDto dto, int idUsuario);
    Task<TicketDetalleDto> RegistrarAsync(RegistrarTicketDto dto, int idUsuario);
    Task<TicketDetalleDto> EditarAsync(int idTicket, EditarTicketDto dto, int idUsuario);
    Task<TicketDetalleDto> RecibirAsync(int idTicket, VersionTicketDto dto, int idUsuario);
    Task<TicketDetalleDto> AsignarAsync(int idTicket, AsignarTicketDto dto, int idUsuario);
    Task<TicketDetalleDto> IniciarAsync(int idTicket, VersionTicketDto dto, int idUsuario);
    Task<TicketDetalleDto> CancelarAsync(int idTicket, MotivoTicketDto dto, int idUsuario);
    Task<TicketDetalleDto> GuardarTrabajoAsync(int idTicket, GuardarTrabajoTicketDto dto, int idUsuario);
    Task<TicketDetalleDto> DerivarReparacionAsync(int idTicket, VersionTicketDto dto, int idUsuario);
    Task<TicketDetalleDto> RegistrarFacturaAsync(int idTicket, ReferenciaFacturaDto dto, int idUsuario);
    Task<TicketDetalleDto> CerrarAsync(int idTicket, GuardarTrabajoTicketDto dto, int idUsuario);
    Task<TicketDetalleDto> InactivarAsync(int idTicket, MotivoTicketDto dto, int idUsuario);
    Task<List<HistorialTicketDto>> HistorialAsync(FiltroHistorialTicketsDto filtro, int idUsuario);
    Task<IndicadoresTicketsDto> IndicadoresAsync(DateOnly? desde, DateOnly? hasta, int idUsuario);
    Task<List<AuditoriaTicketDto>> AuditoriaAsync(FiltroAuditoriaTicketsDto filtro, int idUsuario);
    Task<List<GarantiaTicketDto>> GarantiasAsync(FiltroGarantiasDto filtro, int idUsuario);
    Task AgregarSeguimientoAsync(long idGarantia, AgregarSeguimientoGarantiaDto dto, int idUsuario);
    Task<ArchivoExportadoDto> ComprobanteAsync(int idTicket, int idUsuario);
    Task EnviarComprobanteAsync(int idTicket, EnviarComprobanteDto dto, int idUsuario);
    Task<ArchivoExportadoDto> ExportarHistorialAsync(FiltroHistorialTicketsDto filtro, string formato, int idUsuario);
    Task<ArchivoExportadoDto> ExportarGarantiasAsync(FiltroGarantiasDto filtro, string formato, int idUsuario);
}
