namespace SIGRA.Abstracciones.Dtos;

// ---------- RCFR-001: solicitudes de frecuencia radioeléctrica ----------
public class SolicitudFrecuenciaDto
{
    public int IdSolicitud { get; set; }
    public int IdCliente { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public int IdEquipo { get; set; }
    public string NumeroSerie { get; set; } = string.Empty;
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string? Frecuencia { get; set; }
    public string? Banda { get; set; }
    public string? Potencia { get; set; }
    public string? ZonaCobertura { get; set; }
    public DateTime? FechaPresentacion { get; set; }
    public string Estado { get; set; } = string.Empty;
    public DateTime FechaRegistro { get; set; }
    // RCFR-002: datos del otorgamiento; el vencimiento es la fecha de otorgamiento + 5 años.
    public DateTime? FechaOtorgamiento { get; set; }
    public string? NumeroResolucion { get; set; }
    public DateTime? FechaVencimiento { get; set; }
    // RCFR-003: días que faltan para el vencimiento (negativo si ya venció) y vínculo con la renovación.
    public int? DiasParaVencer { get; set; }
    public int? IdSolicitudOrigen { get; set; }
    public int? IdSolicitudRenovacion { get; set; }
    public string? EstadoRenovacion { get; set; }
    // RCFR-005: datos de la cancelación (solo si el estado es "Cancelada").
    public DateTime? FechaCancelacion { get; set; }
    public string? MotivoCancelacion { get; set; }
    public string? UsuarioCancelacion { get; set; }
    // Vendedor responsable: recibe las alertas de vencimiento de la solicitud.
    public int IdVendedor { get; set; }
    public string Vendedor { get; set; } = string.Empty;
    public int CantidadDocumentos { get; set; }
}

public class RepetidoraClienteDto
{
    public int IdEquipo { get; set; }
    public string NumeroSerie { get; set; } = string.Empty;
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public int IdContrato { get; set; }
    public string EstadoContrato { get; set; } = string.Empty;
}

public class RegistrarSolicitudDto
{
    public int? IdCliente { get; set; }
    public int? IdEquipo { get; set; }
    public int? IdVendedor { get; set; }
    public string? Frecuencia { get; set; }
    public string? Banda { get; set; }
    public string? Potencia { get; set; }
    public string? ZonaCobertura { get; set; }
    public DateTime? FechaPresentacion { get; set; }
    // Frecuencia que se está renovando (RCFR-003).
    public int? IdSolicitudOrigen { get; set; }
    public List<SubirDocumentoDto> Documentos { get; set; } = new();
}

public class DocumentoSolicitudDto
{
    public int IdDocumento { get; set; }
    public int IdSolicitud { get; set; }
    public string TipoDocumento { get; set; } = string.Empty;
    public string NombreDocumento { get; set; } = string.Empty;
    public string? NombreArchivo { get; set; }
    public string? TipoContenido { get; set; }
    public int TamanoBytes { get; set; }
    public DateTime FechaCarga { get; set; }
    public string? Usuario { get; set; }
}

public class DocumentoSolicitudArchivoDto
{
    public int IdDocumento { get; set; }
    public int IdSolicitud { get; set; }
    public string NombreDocumento { get; set; } = string.Empty;
    public string NombreArchivo { get; set; } = string.Empty;
    public string TipoContenido { get; set; } = "application/octet-stream";
    public byte[] Contenido { get; set; } = Array.Empty<byte>();
}

// ---------- RCFR-002: otorgamiento de la frecuencia ----------
public class OtorgarFrecuenciaDto
{
    public DateTime? FechaOtorgamiento { get; set; }
    public string? NumeroResolucion { get; set; }
}

// ---------- RCFR-003: alertas de vencimiento ----------
public class AlertaFrecuenciaDto
{
    public int IdAlerta { get; set; }
    public int IdSolicitud { get; set; }
    // Primera = 6 meses, Segunda = 3 meses, Final = 30 días (urgente).
    public string Tipo { get; set; } = string.Empty;
    public bool Urgente { get; set; }
    public DateTime FechaAlerta { get; set; }
    public DateTime FechaVencimiento { get; set; }
    public int DiasRestantes { get; set; }
    public bool CorreoEnviado { get; set; }
    public DateTime? FechaEnvio { get; set; }
    public string? ErrorEnvio { get; set; }
    public bool Atendida { get; set; }
    public DateTime? FechaAtencion { get; set; }
    public string? NotaAtencion { get; set; }
    public string? UsuarioAtencion { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string NumeroSerie { get; set; } = string.Empty;
    public string? Frecuencia { get; set; }
    public string? Banda { get; set; }
    public string EstadoSolicitud { get; set; } = string.Empty;
    public int IdVendedor { get; set; }
    public string Vendedor { get; set; } = string.Empty;
}

public class AtenderAlertaDto
{
    public string? Nota { get; set; }
}

public class AlertaPorEnviarDto
{
    public int IdAlerta { get; set; }
    public int IdSolicitud { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public DateTime FechaVencimiento { get; set; }
    public int DiasRestantes { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string NumeroSerie { get; set; } = string.Empty;
    public string? Frecuencia { get; set; }
    public string? Banda { get; set; }
    public string Vendedor { get; set; } = string.Empty;
    public string CorreoVendedor { get; set; } = string.Empty;
}

public class ResultadoVerificacionDto
{
    public int AlertasGeneradas { get; set; }
    public int FrecuenciasVencidas { get; set; }
    public int CorreosEnviados { get; set; }
    public int CorreosFallidos { get; set; }
    public string Mensaje { get; set; } = string.Empty;
}

public class FrecuenciaUrgenteDto
{
    public int IdAlerta { get; set; }
    public int IdSolicitud { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string NumeroSerie { get; set; } = string.Empty;
    public string? Frecuencia { get; set; }
    public DateTime FechaVencimiento { get; set; }
    public int DiasRestantes { get; set; }
    public string Vendedor { get; set; } = string.Empty;
    public bool Atendida { get; set; }
}

public class ResumenFrecuenciasDto
{
    public int Vigentes { get; set; }
    public int PorRenovar { get; set; }
    public int EnRenovacion { get; set; }
    public int VencidasSinRenovacion { get; set; }
    public int AlertasPendientes { get; set; }
    public int Urgentes { get; set; }
    public List<FrecuenciaUrgenteDto> FrecuenciasUrgentes { get; set; } = new();
}

// ---------- RCFR-004: historial de renovaciones ----------
// Un ciclo de la frecuencia: la solicitud original (ciclo 1) o cada una de sus renovaciones, en orden cronológico.
public class CicloFrecuenciaDto
{
    public int Ciclo { get; set; }
    public int IdSolicitud { get; set; }
    public string Estado { get; set; } = string.Empty;
    public string? Frecuencia { get; set; }
    public DateTime? FechaPresentacion { get; set; }
    public DateTime? FechaOtorgamiento { get; set; }
    public string? NumeroResolucion { get; set; }
    public DateTime? FechaVencimiento { get; set; }
    public int? IdSolicitudOrigen { get; set; }
    public bool EsActual { get; set; }
}

// ---------- RCFR-005: cancelación de la solicitud ----------
public class CancelarSolicitudDto
{
    public string? Motivo { get; set; }
}

// ---------- RCFR-010: bitácora de auditoría de la solicitud ----------
public class EventoAuditoriaDto
{
    public long IdAuditoria { get; set; }
    // Fecha y hora exactas del evento (UTC).
    public DateTime Fecha { get; set; }
    public int? IdUsuario { get; set; }
    // Usuario responsable; "Sistema" para los eventos automáticos (alertas, vencimientos).
    public string? Usuario { get; set; }
    public string? Rol { get; set; }
    public string Accion { get; set; } = string.Empty;
    // Nombre legible del evento (registro, otorgamiento, renovación, cancelación...).
    public string Evento { get; set; } = string.Empty;
    public string? Detalle { get; set; }
    public bool Automatico { get; set; }
}

public class AuditoriaSolicitudDto
{
    public SolicitudFrecuenciaDto Solicitud { get; set; } = new();
    // En orden cronológico: del más antiguo al más reciente.
    public List<EventoAuditoriaDto> Eventos { get; set; } = new();
}
