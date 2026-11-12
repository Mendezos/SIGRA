using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

// CRMGPSC-001 a 007: prospectos y contactos de empresa
public interface ICrmProspectosDA
{
    // ---------- Prospectos ----------
    Task<List<ProspectoDto>> ListarProspectosAsync(string? empresa, string? sector, string? fuente, string? estado, int? idVendedor, DateTime? fechaDesde, DateTime? fechaHasta);
    Task<ProspectoDto?> ObtenerProspectoAsync(int idProspecto);
    Task<ProspectoDetalleDto?> ObtenerDetalleProspectoAsync(int idProspecto, int idUsuario);
    Task<List<CoincidenciaProspectoDto>> BuscarCoincidenciasAsync(string? empresa, string? correo, string? telefono, int? excluirProspecto);
    Task<int> InsertarProspectoAsync(string empresa, string? contacto, string? correo, string? telefono, string? sector, string? direccion,
        int? tamanoFlota, string? fuente, int idVendedor, bool confirmarDuplicado, string? justificacionDuplicado, int idUsuario);
    Task<ProspectoAnteriorDto> EditarProspectoAsync(int idProspecto, string empresa, string? contacto, string? correo, string? telefono, string? sector,
        string? direccion, int? tamanoFlota, string? fuente, int? idVendedor, int idUsuario);
    Task<ProspectoAccionFilaDto> DescartarProspectoAsync(int idProspecto, string motivo, DateTime fecha, string? observacion, int idUsuario);
    Task<ProspectoAccionFilaDto> ReactivarProspectoAsync(int idProspecto, string estadoInicial, DateTime fechaHoraSeguimiento, int? idVendedor, int idUsuario);

    // ---------- Contactos de empresa ----------
    Task<List<ContactoEmpresaDto>> ListarContactosAsync(string? tipo, int? idEmpresa, string? texto, bool? activo);
    Task<ContactoEmpresaDto?> ObtenerContactoAsync(int idContactoEmpresa);
    Task<List<CoincidenciaContactoDto>> BuscarCoincidenciasContactoAsync(string tipo, int idEmpresa, string? correo, string? telefono, int? excluirContacto);
    Task<int> InsertarContactoAsync(string tipo, int idEmpresa, string nombre, string? cargo, string? telefono, string? correo, DateTime? fechaCumpleanos,
        string preferenciaContacto, bool esPrincipal, bool confirmarCambioPrincipal, int idUsuario);
    Task<ContactoAnteriorDto> EditarContactoAsync(int idContactoEmpresa, string nombre, string? cargo, string? telefono, string? correo, DateTime? fechaCumpleanos,
        string preferenciaContacto, bool esPrincipal, bool confirmarCambioPrincipal, int idUsuario);
    Task<ContactoAccionFilaDto> DesactivarContactoAsync(int idContactoEmpresa, string motivo, int? idNuevoPrincipal, int idUsuario);
    Task<ContactoAccionFilaDto> ReactivarContactoAsync(int idContactoEmpresa, int idUsuario);
}
