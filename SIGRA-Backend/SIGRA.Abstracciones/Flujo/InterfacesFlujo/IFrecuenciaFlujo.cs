using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

public interface IFrecuenciaFlujo
{
    Task<List<ClienteDto>> ListarClientesAsync();
    Task<List<VendedorDto>> ListarVendedoresAsync();
    Task<List<RepetidoraClienteDto>> ListarRepetidorasDeClienteAsync(int idCliente);

    // idVendedorSesion: id del vendedor cuando quien registra es un vendedor (queda como responsable); null para el administrador.
    Task<SolicitudFrecuenciaDto> RegistrarSolicitudAsync(RegistrarSolicitudDto dto, int? idVendedorSesion, int idUsuario);

    // Búsqueda y filtros (RCFR-006): todos los criterios indicados se combinan. idVendedor filtra por vendedor responsable
    // (para un vendedor siempre es él mismo).
    Task<List<SolicitudFrecuenciaDto>> ListarSolicitudesAsync(string? texto, string? estado, string? cliente, string? zona, int? idVendedor);
    Task<SolicitudFrecuenciaDto> ObtenerSolicitudAsync(int idSolicitud, int? idVendedor);
    Task<SolicitudFrecuenciaDto> CancelarSolicitudAsync(int idSolicitud, CancelarSolicitudDto dto, int? idVendedor, int idUsuario);
    // Bitácora completa de la solicitud: solo para el Administrador (el control de acceso lo hace el controlador).
    Task<AuditoriaSolicitudDto> ObtenerAuditoriaAsync(int idSolicitud);
    Task<List<CicloFrecuenciaDto>> ObtenerHistorialAsync(int idSolicitud, int? idVendedor);
    Task<SolicitudFrecuenciaDto> OtorgarSolicitudAsync(int idSolicitud, OtorgarFrecuenciaDto dto, int? idVendedor, int idUsuario);
    // Alertas de vencimiento (RCFR-003)
    // reintentarTodos: la verificación manual del administrador reintenta también los correos que ya fallaron varias veces.
    Task<ResultadoVerificacionDto> ProcesarAlertasAsync(bool reintentarTodos = false);
    Task<List<AlertaFrecuenciaDto>> ListarAlertasAsync(bool? atendida, int? idVendedor);
    Task<AlertaFrecuenciaDto> AtenderAlertaAsync(int idAlerta, AtenderAlertaDto dto, int? idVendedor, int idUsuario);
    Task<ResumenFrecuenciasDto> ObtenerResumenAsync();

    Task<List<DocumentoSolicitudDto>> ListarDocumentosAsync(int idSolicitud, int? idVendedor);
    Task<DocumentoSolicitudDto> AdjuntarDocumentoAsync(int idSolicitud, SubirDocumentoDto dto, int? idVendedor, int idUsuario);
    Task<DocumentoSolicitudArchivoDto> ObtenerDocumentoAsync(int idDocumento, int? idVendedor);
}
