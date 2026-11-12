using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

// CRMGPSC-001 a 007: prospectos y contactos de empresa
public interface ICrmProspectosFlujo
{
    // ---------- Prospectos ----------
    Task<List<ProspectoDto>> ListarProspectosAsync(string? empresa, string? sector, string? fuente, string? estado, int? idVendedor, DateTime? fechaDesde, DateTime? fechaHasta);
    Task<ProspectoDetalleDto> ObtenerDetalleProspectoAsync(int idProspecto, int idUsuario);
    Task<RegistrarProspectoResultadoDto> RegistrarProspectoAsync(RegistrarProspectoDto dto, int idUsuario);
    Task<ProspectoDto> EditarProspectoAsync(int idProspecto, EditarProspectoDto dto, int idUsuario);
    Task<ProspectoAccionResultadoDto> DescartarProspectoAsync(int idProspecto, DescartarProspectoDto dto, int idUsuario);
    Task<ProspectoAccionResultadoDto> ReactivarProspectoAsync(int idProspecto, ReactivarProspectoDto dto, int idUsuario);

    // ---------- Contactos de empresa ----------
    Task<List<ContactoEmpresaDto>> ListarContactosAsync(string? tipo, int? idEmpresa, string? texto, string? estado);
    Task<ContactoEmpresaDto> ObtenerContactoAsync(int idContactoEmpresa);
    Task<GuardarContactoResultadoDto> RegistrarContactoAsync(RegistrarContactoEmpresaDto dto, int idUsuario);
    Task<GuardarContactoResultadoDto> EditarContactoAsync(int idContactoEmpresa, EditarContactoEmpresaDto dto, int idUsuario);
    Task<ContactoAccionResultadoDto> DesactivarContactoAsync(int idContactoEmpresa, DesactivarContactoDto dto, int idUsuario);
    Task<ContactoAccionResultadoDto> ReactivarContactoAsync(int idContactoEmpresa, int idUsuario);
}
