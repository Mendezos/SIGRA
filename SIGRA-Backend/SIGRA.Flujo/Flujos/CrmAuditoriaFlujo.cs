using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.Flujo.Flujos;

// CRMGPSC-026: el administrador consulta qué cambios se hicieron en prospectos, clientes, contactos, notas, interacciones y seguimientos.
public class CrmAuditoriaFlujo(ICrmAuditoriaDA da, IUsuarioDA usuarios) : ICrmAuditoriaFlujo
{
    private const string RolAdministrador = "Administrador del sistema";
    private static readonly string[] Entidades = { "Prospecto", "Cliente", "ContactoEmpresa", "NotaCRM", "InteraccionCRM", "Seguimiento", "SerieContacto" };

    private static string? Normalizar(string? t) => string.IsNullOrWhiteSpace(t) ? null : t.Trim();

    private async Task ValidarAdministradorAsync(int idUsuario)
    {
        var u = await usuarios.ObtenerPorIdAsync(idUsuario) ?? throw new AccesoDenegadoException("La cuenta ya no está activa.");
        if (!string.Equals(u.NombreRol, RolAdministrador, StringComparison.OrdinalIgnoreCase))
            throw new AccesoDenegadoException("Solo el administrador puede consultar el historial del CRM.");
    }

    public async Task<PaginaAuditoriaCrmDto> ConsultarAsync(FiltroAuditoriaCrmDto filtro, int idUsuario)
    {
        await ValidarAdministradorAsync(idUsuario);

        if (filtro.Desde is not null && filtro.Hasta is not null && filtro.Desde.Value.Date > filtro.Hasta.Value.Date)
            throw new ReglaNegocioException("La fecha inicial no puede ser posterior a la final. Corrija el rango de fechas.");

        var entidad = Normalizar(filtro.Entidad);
        if (entidad is not null)
        {
            entidad = Entidades.FirstOrDefault(e => string.Equals(e, entidad, StringComparison.OrdinalIgnoreCase))
                ?? throw new ReglaNegocioException("La entidad indicada no es válida.");
        }

        return await da.ConsultarAsync(new FiltroAuditoriaCrmDto
        {
            Entidad = entidad,
            IdEntidad = filtro.IdEntidad,
            IdAutor = filtro.IdAutor,
            Accion = Normalizar(filtro.Accion),
            Empresa = Normalizar(filtro.Empresa),
            IdVendedor = filtro.IdVendedor,
            Desde = filtro.Desde?.Date,
            Hasta = filtro.Hasta?.Date,
            Pagina = filtro.Pagina,
            TamanoPagina = filtro.TamanoPagina,
        });
    }

    public async Task<DetalleAuditoriaCrmDto> ObtenerDetalleAsync(long idAuditoria, int idUsuario)
    {
        await ValidarAdministradorAsync(idUsuario);
        return await da.ObtenerDetalleAsync(idAuditoria) ?? throw new ReglaNegocioException("El evento indicado no existe.");
    }
}
