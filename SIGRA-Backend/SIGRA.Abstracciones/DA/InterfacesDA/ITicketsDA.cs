using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Modelos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface ITicketsDA
{
    Task<List<ResponsableAuditoriaTicketDto>> ResponsablesAuditoriaAsync();
    Task<AccesoModuloModel?> AccesoAsync(int idUsuario);
    Task<PaginaDto<TicketDetalleDto>> ListarAsync(FiltroTicketsDto filtro);
    Task<ResumenTicketsDto> ResumenAsync(int? idTecnico);
    Task<TicketDetalleDto?> ObtenerAsync(int idTicket);
    Task<SeguimientoTicketDto?> SeguimientoAsync(string codigo);
    Task<List<SeguimientoTicketDto>> SeguimientoClienteAsync(string empresa);
    Task<List<ClienteTicketDto>> ClientesAsync(string? texto);
    Task<List<TecnicoTicketDto>> TecnicosAsync();
    Task<ConfiguracionTicketsDto> ConfiguracionAsync();
    Task GuardarConfiguracionAsync(ConfiguracionTicketsDto configuracion, int idUsuario);
    Task GuardarEspecialidadesAsync(int idTecnico, List<string> especialidades, int idUsuario);
    Task<List<EquipoContratoModel>> EquiposContratosAsync(List<string> series);
    Task<int> RegistrarAsync(RegistrarTicketDto dto, int idUsuario);
    Task CambiarAsync(CambioTicket cambio);
    Task<List<HistorialTicketDto>> HistorialAsync(FiltroHistorialTicketsDto filtro);
    Task<IndicadoresTicketsDto> IndicadoresAsync(DateOnly? desde, DateOnly? hasta);
    Task<List<AuditoriaTicketDto>> AuditoriaAsync(FiltroAuditoriaTicketsDto filtro);
    Task<List<GarantiaTicketDto>> GarantiasAsync(FiltroGarantiasDto filtro);
    Task AgregarSeguimientoAsync(long idGarantia, AgregarSeguimientoGarantiaDto dto, int idUsuario);
}
