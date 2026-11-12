using System.Data;
using Dapper;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.DA.Repositorios;

// CRMGPSC-026: historial de cambios del CRM para el administrador
public class CrmAuditoriaDA(IConexionFactory factory) : ICrmAuditoriaDA
{
    public async Task<PaginaAuditoriaCrmDto> ConsultarAsync(FiltroAuditoriaCrmDto f)
    {
        using var c = factory.CrearConexion();
        using var r = await c.QueryMultipleAsync("sp_CrmAuditoria_Consultar", new
        {
            f.Entidad, f.IdEntidad, f.IdAutor, f.Accion, f.Empresa, f.IdVendedor,
            Desde = f.Desde?.Date, Hasta = f.Hasta?.Date, f.Pagina, f.TamanoPagina,
        }, commandType: CommandType.StoredProcedure);
        var pagina = await r.ReadFirstAsync<PaginaAuditoriaCrmDto>();
        pagina.Items = (await r.ReadAsync<EventoAuditoriaCrmDto>()).ToList();
        return pagina;
    }

    public async Task<DetalleAuditoriaCrmDto?> ObtenerDetalleAsync(long idAuditoria)
    {
        using var c = factory.CrearConexion();
        using var r = await c.QueryMultipleAsync("sp_CrmAuditoria_Detalle", new { IdAuditoria = idAuditoria }, commandType: CommandType.StoredProcedure);
        var evento = await r.ReadFirstOrDefaultAsync<EventoAuditoriaCrmDto>();
        if (evento is null) return null;
        return new DetalleAuditoriaCrmDto { Evento = evento, Relacionados = (await r.ReadAsync<EventoAuditoriaCrmDto>()).ToList() };
    }
}
