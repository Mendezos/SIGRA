using System.Text.Json.Serialization;

namespace SIGRA.Abstracciones.Dtos;

// CRMGPSC-001 a 007: prospectos y contactos de empresa

// ---------- Prospectos ----------
public class ProspectoDto
{
    public int IdProspecto { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string? Contacto { get; set; }
    public string? Correo { get; set; }
    public string? Telefono { get; set; }
    public string Estado { get; set; } = string.Empty;
    public string? Sector { get; set; }
    public string? Direccion { get; set; }
    public int? TamanoFlota { get; set; }
    public string? Fuente { get; set; }
    public int? IdVendedor { get; set; }
    public string? Vendedor { get; set; }
    public bool VendedorActivo { get; set; }
    // Fecha en Costa Rica (sin hora).
    public DateTime FechaIngreso { get; set; }
    public string? JustificacionDuplicado { get; set; }
    public string? MotivoDescarte { get; set; }
    public string? ObservacionDescarte { get; set; }
    // Fecha y hora de pared de Costa Rica en que se registró el descarte.
    public DateTime? FechaDescarte { get; set; }
    public int? IdCliente { get; set; }
    public string? ClienteEmpresa { get; set; }
    public DateTimeOffset FechaCreacion { get; set; }
    public string? CreadoPor { get; set; }
}

public class CoincidenciaProspectoDto
{
    public string Tipo { get; set; } = string.Empty;          // "Prospecto" | "Cliente"
    public int IdEmpresa { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string MotivoCoincidencia { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
}

public class RegistrarProspectoDto
{
    public string? Empresa { get; set; }
    public string? Sector { get; set; }
    public string? Direccion { get; set; }
    public string? Telefono { get; set; }
    public string? Correo { get; set; }
    public string? Contacto { get; set; }
    // Se recibe como número decimal para poder rechazar con un mensaje claro los valores que no son enteros o son negativos.
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public decimal? TamanoFlota { get; set; }
    public string? Fuente { get; set; }
    // Al crear siempre es "Nuevo": si se envía otro valor se rechaza.
    public string? Estado { get; set; }
    public int? IdVendedor { get; set; }
    public bool ConfirmarDuplicado { get; set; }
    public string? JustificacionDuplicado { get; set; }
}

public class EditarProspectoDto
{
    public string? Empresa { get; set; }
    public string? Sector { get; set; }
    public string? Direccion { get; set; }
    public string? Telefono { get; set; }
    public string? Correo { get; set; }
    public string? Contacto { get; set; }
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public decimal? TamanoFlota { get; set; }
    public string? Fuente { get; set; }
    // Sin valor = se conserva al responsable actual.
    public int? IdVendedor { get; set; }
}

public class RegistrarProspectoResultadoDto
{
    // true = hay coincidencias y todavía no se registró nada: se espera la decisión del vendedor.
    public bool RequiereConfirmacion { get; set; }
    public List<CoincidenciaProspectoDto> Coincidencias { get; set; } = new();
    public string Mensaje { get; set; } = string.Empty;
    public ProspectoDto? Prospecto { get; set; }
}

/// <summary>Valores anteriores de un prospecto editado (los devuelve el SP para la auditoría).</summary>
public class ProspectoAnteriorDto
{
    public string Empresa { get; set; } = string.Empty;
    public string? Contacto { get; set; }
    public string? Correo { get; set; }
    public string? Telefono { get; set; }
    public string? Sector { get; set; }
    public string? Direccion { get; set; }
    public int? TamanoFlota { get; set; }
    public string? Fuente { get; set; }
    public int? IdVendedor { get; set; }
    public string? Vendedor { get; set; }
}

public class DescartarProspectoDto
{
    public string? Motivo { get; set; }
    // Fecha del descarte (por defecto hoy en Costa Rica; no puede ser futura).
    public DateTime? Fecha { get; set; }
    public string? Observacion { get; set; }
}

public class ReactivarProspectoDto
{
    public string? EstadoInicial { get; set; }
    // Hora de pared de Costa Rica, sin zona horaria.
    public DateTime? FechaHoraSeguimiento { get; set; }
    // Solo se necesita cuando el responsable actual está inactivo.
    public int? IdVendedor { get; set; }
}

/// <summary>Fila que devuelven sp_CrmProspecto_Descartar y sp_CrmProspecto_Reactivar.</summary>
public class ProspectoAccionFilaDto
{
    public string Resultado { get; set; } = string.Empty;       // Aplicado | SinCambios | Convertido
    public string Estado { get; set; } = string.Empty;
    public int? IdCliente { get; set; }
    public string? ClienteEmpresa { get; set; }
    public int SeguimientosCancelados { get; set; }
    public int SeriesCanceladas { get; set; }
    public int? IdSeguimiento { get; set; }
}

public static class ResultadosProspecto
{
    public const string Aplicado = "Aplicado";
    public const string SinCambios = "SinCambios";
    public const string Rechazado = "Rechazado";
}

public class ProspectoAccionResultadoDto
{
    // Aplicado: se hizo el cambio. SinCambios: el prospecto ya tenía ese estado (no se duplicó nada).
    // Rechazado: no se hizo nada (el prospecto ya está convertido en cliente: IdCliente indica el cliente vinculado).
    public string Resultado { get; set; } = ResultadosProspecto.Aplicado;
    public string? Codigo { get; set; }
    public string Mensaje { get; set; } = string.Empty;
    public string? EstadoActual { get; set; }
    public int? IdCliente { get; set; }
    public string? ClienteEmpresa { get; set; }
    public int SeguimientosCancelados { get; set; }
    public int SeriesCanceladas { get; set; }
    public int? IdSeguimientoCreado { get; set; }
    public ProspectoDto? Prospecto { get; set; }
}

// ---------- Detalle del prospecto (solo lectura) ----------
public class ProspectoContactoDto
{
    public int IdContactoEmpresa { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Cargo { get; set; }
    public string? Telefono { get; set; }
    public string? Correo { get; set; }
    public DateTime? FechaCumpleanos { get; set; }
    public string PreferenciaContacto { get; set; } = "Cualquiera";
    public bool EsPrincipal { get; set; }
    public bool Activo { get; set; }
    public string? MotivoDesactivacion { get; set; }
}

public class ProspectoCotizacionDto
{
    public int IdCotizacion { get; set; }
    public DateTime Fecha { get; set; }
    public decimal Monto { get; set; }
    public string Moneda { get; set; } = "CRC";
    public string Estado { get; set; } = string.Empty;
    public int Version { get; set; }
}

public class ProspectoNotaDto
{
    public int IdNota { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public string Texto { get; set; } = string.Empty;
    public string Visibilidad { get; set; } = string.Empty;
    public string? Autor { get; set; }
    public DateTimeOffset Fecha { get; set; }
}

public class ProspectoInteraccionDto
{
    public int IdInteraccion { get; set; }
    // Hora de pared de Costa Rica.
    public DateTime Fecha { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public string? Detalle { get; set; }
    public string? Resultado { get; set; }
    public string? ProximoPaso { get; set; }
    public string? Usuario { get; set; }
    public string? Contacto { get; set; }
}

public class ProspectoSeguimientoDto
{
    public int IdSeguimiento { get; set; }
    public string Tipo { get; set; } = string.Empty;
    // Hora de pared de Costa Rica.
    public DateTime FechaHora { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public string Prioridad { get; set; } = string.Empty;
    public string? Responsable { get; set; }
    public string Estado { get; set; } = string.Empty;
    public string Origen { get; set; } = string.Empty;
    public string? Resultado { get; set; }
    public string? MotivoCancelacion { get; set; }
}

public class ProspectoCambioEstadoDto
{
    public int IdHistorial { get; set; }
    public string? EstadoAnterior { get; set; }
    public string EstadoNuevo { get; set; } = string.Empty;
    public string? Motivo { get; set; }
    public string? Observacion { get; set; }
    public string? Usuario { get; set; }
    public DateTimeOffset Fecha { get; set; }
}

public class ProspectoDetalleDto
{
    public ProspectoDto Prospecto { get; set; } = new();
    public List<ProspectoContactoDto> Contactos { get; set; } = new();
    public List<ProspectoCotizacionDto> Cotizaciones { get; set; } = new();
    public List<ProspectoNotaDto> Notas { get; set; } = new();
    public List<ProspectoInteraccionDto> Interacciones { get; set; } = new();
    public List<ProspectoSeguimientoDto> Seguimientos { get; set; } = new();
    public List<ProspectoCambioEstadoDto> CambiosEstado { get; set; } = new();
}

// ---------- Contactos de empresa ----------
public class ContactoEmpresaDto
{
    public int IdContactoEmpresa { get; set; }
    public string Tipo { get; set; } = string.Empty;          // "Prospecto" | "Cliente"
    public int IdEmpresa { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string EstadoEmpresa { get; set; } = string.Empty;
    public bool EmpresaActiva { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Cargo { get; set; }
    public string? Telefono { get; set; }
    public string? Correo { get; set; }
    public DateTime? FechaCumpleanos { get; set; }
    public string PreferenciaContacto { get; set; } = "Cualquiera";
    public bool EsPrincipal { get; set; }
    public bool Activo { get; set; }
    public string? MotivoDesactivacion { get; set; }
    public DateTimeOffset? FechaDesactivacion { get; set; }
    public int CantidadInteracciones { get; set; }
    public int CantidadSeguimientos { get; set; }
}

public class CoincidenciaContactoDto
{
    public int IdContactoEmpresa { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Cargo { get; set; }
    public string? Telefono { get; set; }
    public string? Correo { get; set; }
    public bool Activo { get; set; }
    public bool EsPrincipal { get; set; }
    public string MotivoCoincidencia { get; set; } = string.Empty;
}

public class RegistrarContactoEmpresaDto
{
    public string? Tipo { get; set; }
    public int? IdEmpresa { get; set; }
    public string? Nombre { get; set; }
    public string? Cargo { get; set; }
    public string? Telefono { get; set; }
    public string? Correo { get; set; }
    public DateTime? FechaCumpleanos { get; set; }
    public string? PreferenciaContacto { get; set; }
    public bool EsPrincipal { get; set; }
    public bool ConfirmarCambioPrincipal { get; set; }
}

public class EditarContactoEmpresaDto
{
    public string? Nombre { get; set; }
    public string? Cargo { get; set; }
    public string? Telefono { get; set; }
    public string? Correo { get; set; }
    public DateTime? FechaCumpleanos { get; set; }
    public string? PreferenciaContacto { get; set; }
    public bool EsPrincipal { get; set; }
    public bool ConfirmarCambioPrincipal { get; set; }
}

public static class ResultadosContacto
{
    public const string Guardado = "Guardado";
    public const string RequiereConfirmacion = "RequiereConfirmacion";
    public const string Duplicado = "Duplicado";
}

public class GuardarContactoResultadoDto
{
    // Guardado | RequiereConfirmacion (hay otro principal: se espera confirmar el cambio) | Duplicado (solo al crear: ya existe en la empresa).
    public string Resultado { get; set; } = ResultadosContacto.Guardado;
    public bool RequiereConfirmacion { get; set; }
    public string? CodigoConfirmacion { get; set; }
    public string Mensaje { get; set; } = string.Empty;
    public ContactoEmpresaDto? PrincipalActual { get; set; }
    public ContactoEmpresaDto? ContactoExistente { get; set; }
    public ContactoEmpresaDto? Contacto { get; set; }
}

/// <summary>Valores anteriores de un contacto editado (los devuelve el SP para la auditoría).</summary>
public class ContactoAnteriorDto
{
    public string Nombre { get; set; } = string.Empty;
    public string? Cargo { get; set; }
    public string? Telefono { get; set; }
    public string? Correo { get; set; }
    public DateTime? FechaCumpleanos { get; set; }
    public string PreferenciaContacto { get; set; } = "Cualquiera";
    public bool EsPrincipal { get; set; }
}

public class DesactivarContactoDto
{
    public string? Motivo { get; set; }
    // Obligatorio si el contacto es el principal y la empresa tiene otros contactos activos.
    public int? IdNuevoPrincipal { get; set; }
}

/// <summary>Fila que devuelven sp_CrmContacto_Desactivar y sp_CrmContacto_Reactivar.</summary>
public class ContactoAccionFilaDto
{
    public string Resultado { get; set; } = string.Empty;       // Aplicado | SinCambios
    public string Nombre { get; set; } = string.Empty;
    public string? NombreNuevoPrincipal { get; set; }
    public bool SinMarcaPrincipal { get; set; }
}

public class ContactoAccionResultadoDto
{
    public string Resultado { get; set; } = ResultadosProspecto.Aplicado;
    public string Mensaje { get; set; } = string.Empty;
    public bool SinMarcaPrincipal { get; set; }
    public ContactoEmpresaDto? Contacto { get; set; }
}
