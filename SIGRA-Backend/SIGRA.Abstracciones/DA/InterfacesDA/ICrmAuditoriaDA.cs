using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface ICrmAuditoriaDA
{
    Task<PaginaAuditoriaCrmDto> ConsultarAsync(FiltroAuditoriaCrmDto filtro);
    Task<DetalleAuditoriaCrmDto?> ObtenerDetalleAsync(long idAuditoria);
}
