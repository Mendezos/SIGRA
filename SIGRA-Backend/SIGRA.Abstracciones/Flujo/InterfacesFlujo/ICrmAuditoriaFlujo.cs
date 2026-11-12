using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

public interface ICrmAuditoriaFlujo
{
    Task<PaginaAuditoriaCrmDto> ConsultarAsync(FiltroAuditoriaCrmDto filtro, int idUsuario);
    Task<DetalleAuditoriaCrmDto> ObtenerDetalleAsync(long idAuditoria, int idUsuario);
}
