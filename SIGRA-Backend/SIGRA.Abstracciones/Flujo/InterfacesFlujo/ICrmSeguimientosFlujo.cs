using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

// CRMGPSC-015 a 018 y 024: seguimientos, agenda y contactos periódicos
public interface ICrmSeguimientosFlujo
{
    Task<List<CrmSeguimientoDto>> ListarAgendaAsync(CrmAgendaConsultaDto consulta, int idUsuario);
    Task<CrmSeguimientoDto> ObtenerSeguimientoAsync(int idSeguimiento);
    Task<CrmSeguimientoDto> CrearSeguimientoAsync(CrearSeguimientoDto dto, int idUsuario);
    Task<CrmSeguimientoAccionDto> ReprogramarAsync(int idSeguimiento, ReprogramarSeguimientoDto dto, int idUsuario, bool esAdministrador);
    Task<CrmSeguimientoAccionDto> CompletarAsync(int idSeguimiento, CompletarSeguimientoDto dto, int idUsuario, bool esAdministrador);
    Task<CrmSeguimientoAccionDto> CancelarAsync(int idSeguimiento, CancelarSeguimientoDto dto, int idUsuario, bool esAdministrador);

    Task<List<CrmSerieDto>> ListarSeriesAsync(CrmSerieFiltroDto filtro);
    Task<CrmSerieDetalleDto> ObtenerSerieAsync(int idSerie);
    Task<CrmSerieDetalleDto> CrearSerieAsync(CrearSerieDto dto, int idUsuario);
    Task<CrmSerieAccionDto> CancelarSerieAsync(int idSerie, CancelarSerieDto dto, int idUsuario, bool esAdministrador);
}
