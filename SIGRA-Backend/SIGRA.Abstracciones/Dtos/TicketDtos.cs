namespace SIGRA.Abstracciones.Dtos;

public class EquipoEntradaDto
{
    public int? IdTicketEquipo { get; set; }
    public int? IdEquipo { get; set; }
    public string Marca { get; set; } = "";
    public string Modelo { get; set; } = "";
    public string Tipo { get; set; } = "Portátil";
    public string Especialidad { get; set; } = "Radios";
    public string NumeroSerie { get; set; } = "";
    public List<string> Accesorios { get; set; } = new();
    public string Problema { get; set; } = "";
    public int? IdContrato { get; set; }
    public bool CubiertoPorContrato { get; set; }
}

public class RegistrarTicketDto
{
    public Guid Solicitud { get; set; }
    public int? IdCliente { get; set; }
    public string Empresa { get; set; } = "";
    public string Contacto { get; set; } = "";
    public string Telefono { get; set; } = "";
    public string? Cargo { get; set; }
    public string? Correo { get; set; }
    public string TipoServicio { get; set; } = "";
    public List<EquipoEntradaDto> Equipos { get; set; } = new();
    public bool ConfirmarAlquilerOtroCliente { get; set; }
}

public class EditarTicketDto : RegistrarTicketDto
{
    public string Version { get; set; } = "";
}

public class VersionTicketDto
{
    public string Version { get; set; } = "";
}

public class AsignarTicketDto : VersionTicketDto
{
    public int? IdTecnico { get; set; }
    public bool ConfirmarSobrecarga { get; set; }
    public DateOnly? FechaEstimada { get; set; }
}

public class MotivoTicketDto : VersionTicketDto
{
    public string Motivo { get; set; } = "";
}

public class TrabajoTicketDto
{
    public string? ServicioRealizado { get; set; }
    public string? DetallesTrabajo { get; set; }
    public string? Observaciones { get; set; }
    public string? Hallazgos { get; set; }
    public string? Acciones { get; set; }
    public string Etapa { get; set; } = "En diagnóstico";
    public string? Repuesto { get; set; }
    public string? Resolucion { get; set; }
    public bool TieneCobro { get; set; }
    public string? NumeroFactura { get; set; }
    public decimal? Monto { get; set; }
    public string? JustificacionTecnica { get; set; }
    public string? Proveedor { get; set; }
    public string? CasoProveedor { get; set; }
}

public class GuardarTrabajoTicketDto : VersionTicketDto
{
    public TrabajoTicketDto Trabajo { get; set; } = new();
}

public class ReferenciaFacturaDto : VersionTicketDto
{
    public string NumeroFactura { get; set; } = "";
    public decimal? Monto { get; set; }
}

public class TicketDetalleDto
{
    public int IdTicket { get; set; }
    public long NumeroBoleta { get; set; }
    public string CodigoSeguimiento { get; set; } = "";
    public int IdCliente { get; set; }
    public string Empresa { get; set; } = "";
    public string Contacto { get; set; } = "";
    public string Telefono { get; set; } = "";
    public string? Cargo { get; set; }
    public string? Correo { get; set; }
    public string TipoServicio { get; set; } = "";
    public string Estado { get; set; } = "Creada";
    public bool Activo { get; set; } = true;
    public int? IdUsuarioRegistro { get; set; }
    public string? RegistradoPor { get; set; }
    public int? TecnicoReceptor { get; set; }
    public string? RecibidoPor { get; set; }
    public int? IdTecnicoAsignado { get; set; }
    public string? Tecnico { get; set; }
    public bool EsReparacion { get; set; }
    public string? EstadoAsignacion { get; set; }
    public bool FacturaEmitida { get; set; }
    public DateTimeOffset FechaRecepcion { get; set; }
    public DateTimeOffset? FechaRecepcionFisica { get; set; }
    public DateTimeOffset? FechaAsignacion { get; set; }
    public DateTimeOffset? FechaInicio { get; set; }
    public DateTimeOffset? FechaCierre { get; set; }
    public DateTimeOffset? FechaEstimada { get; set; }
    public string? Motivo { get; set; }
    public double HorasEspera { get; set; }
    public string Version { get; set; } = "";
    [System.Text.Json.Serialization.JsonIgnore]
    public string? ComprobanteOriginal { get; set; }
    public List<EquipoEntradaDto> Equipos { get; set; } = new();
    public TrabajoTicketDto Trabajo { get; set; } = new();
    public List<EstadoTicketDto> Estados { get; set; } = new();
    public List<AsignacionTicketDto> Asignaciones { get; set; } = new();
    public List<EdicionTicketDto> Ediciones { get; set; } = new();
}

public class EstadoTicketDto
{
    public string Estado { get; set; } = "";
    public string Usuario { get; set; } = "";
    public DateTimeOffset Fecha { get; set; }
}

public class AsignacionTicketDto
{
    public string Tecnico { get; set; } = "";
    public string Usuario { get; set; } = "";
    public bool Automatica { get; set; }
    public string Criterio { get; set; } = "";
    public DateTimeOffset Fecha { get; set; }
}

public class EdicionTicketDto
{
    public string Usuario { get; set; } = "";
    public DateTimeOffset Fecha { get; set; }
    public string Resumen { get; set; } = "";
}

public class FiltroTicketsDto
{
    public string? Texto { get; set; }
    public int? IdCliente { get; set; }
    public int? IdTecnico { get; set; }
    public string? TipoServicio { get; set; }
    public string? Estado { get; set; }
    public string? Resolucion { get; set; }
    public DateOnly? Desde { get; set; }
    public DateOnly? Hasta { get; set; }
    public bool IncluirInactivos { get; set; }
    public bool SinRecepcionFisica { get; set; }
    public int Pagina { get; set; } = 1;
    public int TamanoPagina { get; set; } = 10;
}

public class PaginaDto<T>
{
    public List<T> Items { get; set; } = new();
    public int Total { get; set; }
    public int Pagina { get; set; }
    public int TamanoPagina { get; set; }
}

public class ResumenTicketsDto
{
    public int Abiertas { get; set; }
    public int EnProceso { get; set; }
    public int CerradasMes { get; set; }
}

public class ResponsableAuditoriaTicketDto
{
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = "";
}

public class TecnicoTicketDto
{
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = "";
    public string Correo { get; set; } = "";
    public int Asignadas { get; set; }
    public int EnProceso { get; set; }
    public int TotalAbiertas => Asignadas + EnProceso;
    public List<string> Especialidades { get; set; } = new();
    public DateTimeOffset? UltimaAsignacion { get; set; }
}

public class ConfiguracionTicketsDto
{
    public int CargaMaxima { get; set; } = 5;
    public int DiasHabilesEstimados { get; set; } = 5;
}

public class EspecialidadesTecnicoDto
{
    public List<string> Especialidades { get; set; } = new();
}

public class FiltroHistorialTicketsDto
{
    public int? IdTicket { get; set; }
    public int? IdCliente { get; set; }
    public string? NumeroSerie { get; set; }
    public DateOnly? Desde { get; set; }
    public DateOnly? Hasta { get; set; }
}

public class HistorialTicketDto
{
    public DateTimeOffset Fecha { get; set; }
    public long NumeroBoleta { get; set; }
    public string Empresa { get; set; } = "";
    public string NumeroSerie { get; set; } = "";
    public string TipoServicio { get; set; } = "";
    public string? Tecnico { get; set; }
    public string? Resolucion { get; set; }
    public string? Observaciones { get; set; }
}

public class IndicadorTecnicoDto
{
    public int IdTecnico { get; set; }
    public string Tecnico { get; set; } = "";
    public int Cerradas { get; set; }
    public int Reparadas { get; set; }
    public int NoReparadas { get; set; }
    public int Garantias { get; set; }
    public double? TasaExito { get; set; }
    public double? PromedioHoras { get; set; }
    public double? PromedioHorasActivas { get; set; }
}

public class MotivoNoReparacionDto
{
    public string Motivo { get; set; } = "";
    public int Cantidad { get; set; }
}

public class IndicadoresTicketsDto
{
    public List<IndicadorTecnicoDto> Tecnicos { get; set; } = new();
    public List<MotivoNoReparacionDto> Motivos { get; set; } = new();
}

public class FiltroGarantiasDto
{
    public int? IdCliente { get; set; }
    public string? Proveedor { get; set; }
    public DateOnly? Desde { get; set; }
    public DateOnly? Hasta { get; set; }
}

public class GarantiaTicketDto
{
    public long IdGarantia { get; set; }
    public int IdTicket { get; set; }
    public long NumeroBoleta { get; set; }
    public string Empresa { get; set; } = "";
    public string NumeroSerie { get; set; } = "";
    public string Equipo { get; set; } = "";
    public string Proveedor { get; set; } = "";
    public string CasoProveedor { get; set; } = "";
    public DateTimeOffset Fecha { get; set; }
    public string Estado { get; set; } = "En trámite";
    public List<SeguimientoGarantiaDto> Seguimiento { get; set; } = new();
}

public class SeguimientoGarantiaDto
{
    public DateTimeOffset Fecha { get; set; }
    public string Usuario { get; set; } = "";
    public string Estado { get; set; } = "";
    public string Nota { get; set; } = "";
}

public class AgregarSeguimientoGarantiaDto
{
    public string Estado { get; set; } = "";
    public string Nota { get; set; } = "";
}

public class FiltroAuditoriaTicketsDto
{
    public long? NumeroBoleta { get; set; }
    public int? IdUsuario { get; set; }
    public DateOnly? Desde { get; set; }
    public DateOnly? Hasta { get; set; }
}

public class AuditoriaTicketDto
{
    public long IdAuditoria { get; set; }
    public long NumeroBoleta { get; set; }
    public string Usuario { get; set; } = "";
    public DateTimeOffset Fecha { get; set; }
    public string Accion { get; set; } = "";
    public string? Detalle { get; set; }
}

public class EnviarComprobanteDto
{
    public string Correo { get; set; } = "";
    public bool Confirmado { get; set; }
}

public class SeguimientoTicketDto
{
    public long NumeroBoleta { get; set; }
    public string Empresa { get; set; } = "";
    public string Estado { get; set; } = "";
    public string TipoServicio { get; set; } = "";
    public DateTimeOffset FechaRecepcion { get; set; }
}

public class ArchivoExportadoDto
{
    public byte[] Contenido { get; set; } = Array.Empty<byte>();
    public string TipoContenido { get; set; } = "";
    public string Nombre { get; set; } = "";
}
