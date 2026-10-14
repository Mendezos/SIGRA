using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface IFrecuenciaDA
{
    // Solicitudes de frecuencia (RCFR-001)
    Task<List<ClienteDto>> ListarClientesAsync();
    Task<List<VendedorDto>> ListarVendedoresAsync();
    Task<List<RepetidoraClienteDto>> ListarRepetidorasDeClienteAsync(int idCliente);
    Task<int> InsertarSolicitudAsync(int idCliente, int idEquipo, int idVendedor, string frecuencia, string banda,
        string potencia, string zonaCobertura, DateTime fechaPresentacion, int? idSolicitudOrigen);
    Task<List<SolicitudFrecuenciaDto>> ListarSolicitudesAsync(string? texto, string? estado, string? cliente, string? zona, int? idVendedor);
    Task<SolicitudFrecuenciaDto?> ObtenerSolicitudAsync(int idSolicitud);
    Task CancelarSolicitudAsync(int idSolicitud, string motivo, int idUsuario);
    Task<List<EventoAuditoriaDto>> ListarAuditoriaAsync(int idSolicitud);
    Task<List<CicloFrecuenciaDto>> ListarHistorialAsync(int idSolicitud);
    Task OtorgarSolicitudAsync(int idSolicitud, DateTime fechaOtorgamiento, string numeroResolucion);
    // Alertas de vencimiento (RCFR-003)
    Task<(List<int> Alertas, List<int> Vencidas)> EvaluarAlertasAsync(DateTime hoy);
    Task<List<AlertaFrecuenciaDto>> ListarAlertasAsync(int? idAlerta, int? idVendedor, bool? atendida);
    Task<List<AlertaPorEnviarDto>> ListarAlertasPorEnviarAsync(int maxIntentos);
    Task MarcarEnvioAlertaAsync(int idAlerta, bool enviado, string? error);
    Task AtenderAlertaAsync(int idAlerta, string nota, int idUsuario);
    Task<ResumenFrecuenciasDto> ObtenerResumenAsync();

    Task<List<DocumentoSolicitudDto>> ListarDocumentosAsync(int idSolicitud);
    Task<DocumentoSolicitudArchivoDto?> ObtenerDocumentoAsync(int idDocumento);
    Task<int> InsertarDocumentoAsync(int idSolicitud, string tipoDocumento, string nombreDocumento, string nombreArchivo,
        string tipoContenido, byte[] contenido, int idUsuario);
}
