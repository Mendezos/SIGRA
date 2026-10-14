namespace SIGRA.Abstracciones.Dtos;

public class VendedorDto
{
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = string.Empty;
}

public class ContactoDto
{
    public int IdContacto { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string? Contacto { get; set; }
    public string MedioContacto { get; set; } = string.Empty;
    public string DatoContacto { get; set; } = string.Empty;
    public string? Motivo { get; set; }
    public int? IdVendedor { get; set; }
    public string? Vendedor { get; set; }
    public string Estado { get; set; } = string.Empty;
    public DateTime FechaRegistro { get; set; }
    public string RegistradoPor { get; set; } = string.Empty;
}

public class ContactoHistorialDto
{
    public DateTime Fecha { get; set; }
    public string Usuario { get; set; } = string.Empty;
    public string? VendedorAnterior { get; set; }
    public string VendedorNuevo { get; set; } = string.Empty;
    public string Motivo { get; set; } = string.Empty;
}

public class ContactoRecienteDto
{
    public int IdContacto { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public DateTime FechaRegistro { get; set; }
    public string? Vendedor { get; set; }
}

public class SugerenciaContactoDto
{
    public VendedorDto? VendedorPrevio { get; set; }
    public ContactoRecienteDto? ContactoReciente { get; set; }
}

public class RegistrarContactoDto
{
    public string? Empresa { get; set; }
    public string? Contacto { get; set; }
    public string? MedioContacto { get; set; }
    public string? DatoContacto { get; set; }
    public string? Motivo { get; set; }
    public int? IdVendedor { get; set; }
    public bool ConfirmarDuplicado { get; set; }
}

public class RegistrarContactoResultadoDto
{
    public bool RequiereConfirmacion { get; set; }
    public ContactoRecienteDto? ContactoReciente { get; set; }
    public ContactoDto? Contacto { get; set; }
    public string Mensaje { get; set; } = string.Empty;
}

public class ReasignarContactoDto
{
    public int? IdVendedor { get; set; }
    public string? Motivo { get; set; }
}

public class DetalleContactoDto
{
    public ContactoDto Contacto { get; set; } = new();
    public List<ContactoHistorialDto> Historial { get; set; } = new();
}

public class ClienteDto
{
    public int IdCliente { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string? Contacto { get; set; }
    public string? Correo { get; set; }
    public string? Telefono { get; set; }
}

public class EquipoDisponibleDto
{
    public int IdEquipo { get; set; }
    public string NumeroSerie { get; set; } = string.Empty;
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string? Ubicacion { get; set; }
}

public class RegistrarContratoDto
{
    public string? Empresa { get; set; }
    public DateTime? FechaInicio { get; set; }
    public DateTime? FechaVencimiento { get; set; }
    public decimal? MontoMensual { get; set; }
    public string? Condiciones { get; set; }
    public bool CubreReparaciones { get; set; }
    public List<string>? Series { get; set; }
    public List<AccesorioContratoItemDto>? Accesorios { get; set; }
}

public class ContratoDto
{
    public int IdContrato { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string EstadoRegistrado { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public DateTime FechaInicio { get; set; }
    public DateTime FechaVencimiento { get; set; }
    public decimal MontoMensual { get; set; }
    public string? Condiciones { get; set; }
    public bool CubreReparaciones { get; set; }
    public int? IdVendedor { get; set; }
    public string? Vendedor { get; set; }
    public string? MotivoCancelacion { get; set; }
    public DateTime? FechaCancelacion { get; set; }
    public int CantidadEquipos { get; set; }
    public string Series { get; set; } = string.Empty;
}

public class ContratoEquipoDto
{
    public int IdEquipo { get; set; }
    public string NumeroSerie { get; set; } = string.Empty;
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public DateTime FechaAsignacion { get; set; }
}

public class DetalleContratoDto
{
    public ContratoDto Contrato { get; set; } = new();
    public List<ContratoEquipoDto> Equipos { get; set; } = new();
    public List<ContratoAccesorioDto> Accesorios { get; set; } = new();
}

public class AgregarRadioDto
{
    public int? IdContrato { get; set; }
    public string? NumeroSerie { get; set; }
    public DateTime? FechaAsignacion { get; set; }
}

public class RadioDto
{
    public int IdEquipo { get; set; }
    public string NumeroSerie { get; set; } = string.Empty;
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public string? Ubicacion { get; set; }
    public int IdContrato { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public DateTime FechaAsignacion { get; set; }
    public DateTime? UltimoCambioBateria { get; set; }
    public string? NumeroSerieBateria { get; set; }
    public string EstadoBateria { get; set; } = string.Empty;
    public DateTime? FechaVencimientoBateria { get; set; }
}

public class RenovarContratoDto
{
    public DateTime? NuevaFechaVencimiento { get; set; }
    public decimal? NuevoMonto { get; set; }
    public string? Observacion { get; set; }
    public List<string>? SeriesAgregar { get; set; }
    public List<int>? IdsRetirar { get; set; }
}

public class CancelarContratoDto
{
    public string? Motivo { get; set; }
}

public class RenovacionDto
{
    public DateTime FechaRenovacion { get; set; }
    public string? Usuario { get; set; }
    public DateTime? FechaVencimientoAnterior { get; set; }
    public DateTime NuevaFechaVencimiento { get; set; }
    public decimal? MontoMensual { get; set; }
    public string? Observacion { get; set; }
}

public class AuditoriaContratoDto
{
    public long IdAuditoria { get; set; }
    public DateTime Fecha { get; set; }
    public string Accion { get; set; } = string.Empty;
    public string? Detalle { get; set; }
    public string Usuario { get; set; } = string.Empty;
}

public class AlertaContratoDto
{
    public int IdContrato { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string? Contacto { get; set; }
    public string? CorreoCliente { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime FechaVencimiento { get; set; }
    public string Tipo { get; set; } = string.Empty;
}

public class AdministradorDto
{
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Correo { get; set; } = string.Empty;
}

public class CambioBateriaDto
{
    public DateTime FechaCambio { get; set; }
    public string? NumeroSerieBateria { get; set; }
    public string Usuario { get; set; } = string.Empty;
}

public class RegistrarBateriaDto
{
    public int? IdEquipo { get; set; }
    public string? NumeroSerieBateria { get; set; }
    public DateTime? FechaCambio { get; set; }
}

public class ResultadoProcesoVencimientosDto
{
    public int ContratosVencidos { get; set; }
    public int AlertasGeneradas { get; set; }
    public List<string> Errores { get; set; } = new();
}

public class AccesorioContratoItemDto
{
    public int IdAccesorioModelo { get; set; }
    public int Cantidad { get; set; }
}

public class ContratoAccesorioDto
{
    public int IdAccesorioModelo { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public int Cantidad { get; set; }
}

public class GuardarAccesoriosContratoDto
{
    public List<AccesorioContratoItemDto>? Accesorios { get; set; }
}

// ---------- CARR-009: ficha técnica de repetidoras ----------
public class RepetidoraDto
{
    public int IdEquipo { get; set; }
    public string NumeroSerie { get; set; } = string.Empty;
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public int? IdContrato { get; set; }
    public string? Empresa { get; set; }
    public string? EstadoContrato { get; set; }
    public DateTime? FechaAsignacion { get; set; }
    public bool TieneFicha { get; set; }
    public string? Frecuencia { get; set; }
    public string? FrecuenciaRecepcion { get; set; }
    public string? Potencia { get; set; }
    public string? Accesorios { get; set; }
    public string? DireccionInstalacion { get; set; }
    public string EstadoChecklist { get; set; } = "Sin checklist";
    public string? Clasificacion { get; set; }
    // Alquilada por Radifax = facturable; Propia del cliente = sin cobro (solo bitácora de garantía y control administrativo).
    public bool Facturable { get; set; }
    public string? CoordenadasGPS { get; set; }
    public DateTime? FechaRegistro { get; set; }
    public string? RegistradoPor { get; set; }

    // La ficha existe pero no se registraron coordenadas GPS (campo opcional).
    public bool SinCoordenadas => TieneFicha && string.IsNullOrWhiteSpace(CoordenadasGPS);
}

public class GuardarFichaRepetidoraDto
{
    public string? NumeroSerie { get; set; }
    public string? Modelo { get; set; }
    public string? Frecuencia { get; set; }
    public string? FrecuenciaRecepcion { get; set; }
    public string? Potencia { get; set; }
    public string? Accesorios { get; set; }
    public string? DireccionInstalacion { get; set; }
    public string? CoordenadasGPS { get; set; }
    public string? Clasificacion { get; set; }
}

// ---------- CARR-011: checklist previo a la instalación ----------
public class RequisitoChecklistDto
{
    public int IdRequisito { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public bool Cumplido { get; set; }
}

public class VerificacionChecklistDto
{
    public int IdChecklist { get; set; }
    public DateTime FechaVerificacion { get; set; }
    public bool Completado { get; set; }
    public string? Observaciones { get; set; }
    public string? Usuario { get; set; }
    public int Pendientes { get; set; }
}

public class GuardarChecklistDto
{
    public List<int>? Cumplidos { get; set; }
    public string? Observaciones { get; set; }
}

public class ChecklistRepetidoraDto
{
    public RepetidoraDto Repetidora { get; set; } = new();
    // Resultado de la última verificación (todos "no cumplidos" si aún no hay ninguna).
    public List<RequisitoChecklistDto> Requisitos { get; set; } = new();
    public VerificacionChecklistDto? Ultima { get; set; }
    public List<VerificacionChecklistDto> Historial { get; set; } = new();
    // Solo es true cuando la última verificación tiene todos los requisitos cumplidos.
    public bool ListaParaInstalacion { get; set; }
    public List<string> Pendientes { get; set; } = new();
    public string? Mensaje { get; set; }
    public string? Advertencia { get; set; }
}

// ---------- CARR-012: documentos técnicos de la repetidora ----------
public class DocumentoRepetidoraDto
{
    public int IdDocumento { get; set; }
    public int IdEquipo { get; set; }
    public string TipoDocumento { get; set; } = string.Empty;
    public string NombreDocumento { get; set; } = string.Empty;
    public string? NombreArchivo { get; set; }
    public string? TipoContenido { get; set; }
    public int TamanoBytes { get; set; }
    public DateTime FechaCarga { get; set; }
    public string? Usuario { get; set; }
}

public class DocumentoArchivoDto
{
    public int IdDocumento { get; set; }
    public int IdEquipo { get; set; }
    public string NombreDocumento { get; set; } = string.Empty;
    public string NombreArchivo { get; set; } = string.Empty;
    public string TipoContenido { get; set; } = "application/octet-stream";
    public byte[] Contenido { get; set; } = Array.Empty<byte>();
}

public class SubirDocumentoDto
{
    public string? NombreArchivo { get; set; }
    public byte[]? Contenido { get; set; }
    public string? TipoDocumento { get; set; }
    public string? NombreDocumento { get; set; }
}

// ---------- CARR-013: bitácora de mantenimiento de la repetidora ----------
public class BitacoraMantenimientoDto
{
    public long IdBitacora { get; set; }
    public DateTime Fecha { get; set; }
    public int IdTicket { get; set; }
    public string CodigoTicket { get; set; } = string.Empty;
    public string TipoServicio { get; set; } = string.Empty;
    public string? Tecnico { get; set; }
    public string? Resolucion { get; set; }
    public string Detalle { get; set; } = string.Empty;
}
