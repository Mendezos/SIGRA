namespace SIGRA.Abstracciones.Dtos;

// CRMGPSC-015 a 018 y 024: seguimientos, agenda y contactos periódicos
// Las fechas y horas que el usuario programa (FechaHora, FechaReal, FechaInicial...) son hora de pared de Costa Rica y viajan
// SIN zona horaria ("2026-11-12T14:30:00"). Las marcas del sistema (FechaCreacion, FechaCierre, Fecha del historial) son UTC.

/// <summary>Seguimiento programado a un prospecto o cliente (una fila de la agenda).</summary>
public class CrmSeguimientoDto
{
    public int IdSeguimiento { get; set; }
    public string Codigo => $"SG-{IdSeguimiento:0000}";
    public string TipoEmpresa { get; set; } = "";          // "Prospecto" | "Cliente"
    public int IdEmpresa { get; set; }
    public string Empresa { get; set; } = "";
    public int? IdContactoEmpresa { get; set; }
    public string? Contacto { get; set; }
    public string Tipo { get; set; } = "";
    public DateTime FechaHora { get; set; }
    public DateTime FechaHoraOriginal { get; set; }
    public bool Reprogramado => FechaHora != FechaHoraOriginal;
    public string Motivo { get; set; } = "";
    public string Prioridad { get; set; } = "";
    public int IdResponsable { get; set; }
    public string? Responsable { get; set; }
    public string Estado { get; set; } = "";
    public string Origen { get; set; } = "";
    public int? IdSerie { get; set; }
    public DateTime? FechaReal { get; set; }
    public string? Resultado { get; set; }
    public string? Observaciones { get; set; }
    public string? ProximoPaso { get; set; }
    public string? MotivoCancelacion { get; set; }
    public DateTimeOffset? FechaCierre { get; set; }
    public int? IdUsuarioCierre { get; set; }
    public string? UsuarioCierre { get; set; }
    public int? IdInteraccion { get; set; }
    /// <summary>Minutos transcurridos desde la fecha programada; solo viene si el seguimiento está Atrasado.</summary>
    public int? MinutosAtraso { get; set; }
    public DateTimeOffset FechaCreacion { get; set; }
    public string? CreadoPor { get; set; }
    /// <summary>Historial de cambios; solo viene al consultar un seguimiento puntual.</summary>
    public List<CrmSeguimientoHistorialDto>? Historial { get; set; }
}

public class CrmSeguimientoHistorialDto
{
    public int IdHistorial { get; set; }
    public int IdSeguimiento { get; set; }
    public string Accion { get; set; } = "";               // Creado | Reprogramado | Completado | Cancelado | Reasignado
    public DateTime? FechaHoraAnterior { get; set; }
    public DateTime? FechaHoraNueva { get; set; }
    public string? Motivo { get; set; }
    public int? IdUsuario { get; set; }
    public string? Usuario { get; set; }
    public DateTimeOffset Fecha { get; set; }
}

/// <summary>Resultado de reprogramar, completar o cancelar. Aplicado = false cuando el seguimiento ya estaba cerrado y no se repitió el cierre.</summary>
public class CrmSeguimientoAccionDto
{
    public bool Aplicado { get; set; }
    public string Mensaje { get; set; } = "";
    public CrmSeguimientoDto Seguimiento { get; set; } = new();
}

/// <summary>Criterios de «Mi agenda». Todos son opcionales; lo que falte toma el valor por defecto (ver CrmSeguimientosFlujo.ListarAgendaAsync).</summary>
public class CrmAgendaConsultaDto
{
    /// <summary>Responsable; si no se indica se usa el usuario actual (salvo TodosResponsables).</summary>
    public int? IdResponsable { get; set; }
    public bool TodosResponsables { get; set; }
    /// <summary>Fecha inicial del rango, "yyyy-MM-dd".</summary>
    public string? Desde { get; set; }
    /// <summary>Fecha final del rango (inclusive), "yyyy-MM-dd".</summary>
    public string? Hasta { get; set; }
    /// <summary>Con true no se limita por fechas (por ejemplo, para ver todos los atrasados).</summary>
    public bool SinRango { get; set; }
    public string? Prioridad { get; set; }
    public string? Tipo { get; set; }
    /// <summary>Pendiente | Atrasado | Completado | Cancelado | Abiertos (Pendiente y Atrasado, por defecto) | Todos.</summary>
    public string? Estado { get; set; }
    public string? Texto { get; set; }
}

/// <summary>Criterios ya validados que la capa de datos envía al procedimiento almacenado.</summary>
public class CrmSeguimientoFiltro
{
    public int? IdResponsable { get; set; }
    public DateTime? Desde { get; set; }
    public DateTime? Hasta { get; set; }
    public string? Prioridad { get; set; }
    public string? Tipo { get; set; }
    public string? Estado { get; set; }
    public bool SoloAbiertos { get; set; }
    public string? Texto { get; set; }
}

public class CrearSeguimientoDto
{
    public string? TipoEmpresa { get; set; }
    public int? IdEmpresa { get; set; }
    public int? IdContactoEmpresa { get; set; }
    public string? Tipo { get; set; }
    /// <summary>"yyyy-MM-dd".</summary>
    public string? Fecha { get; set; }
    /// <summary>"HH:mm".</summary>
    public string? Hora { get; set; }
    public string? Motivo { get; set; }
    public string? Prioridad { get; set; }
    public int? IdResponsable { get; set; }
}

public class ReprogramarSeguimientoDto
{
    public string? Fecha { get; set; }
    public string? Hora { get; set; }
    public string? Motivo { get; set; }
}

public class CompletarSeguimientoDto
{
    /// <summary>"yyyy-MM-ddTHH:mm"; si se omite se usa la hora actual de Costa Rica.</summary>
    public string? FechaReal { get; set; }
    public string? Resultado { get; set; }
    public string? Observaciones { get; set; }
    public string? ProximoPaso { get; set; }
}

public class CancelarSeguimientoDto
{
    public string? Motivo { get; set; }
}

// ---------- Contactos periódicos (CRMGPSC-024) ----------

public class CrmSerieDto
{
    public int IdSerie { get; set; }
    public string Codigo => $"SC-{IdSerie:0000}";
    public string TipoEmpresa { get; set; } = "";
    public int IdEmpresa { get; set; }
    public string Empresa { get; set; } = "";
    public int? IdContactoEmpresa { get; set; }
    public string? Contacto { get; set; }
    public string Periodicidad { get; set; } = "";
    public DateTime FechaInicial { get; set; }
    /// <summary>"HH:mm".</summary>
    public string Hora { get; set; } = "";
    public string Tipo { get; set; } = "";
    public string Motivo { get; set; } = "";
    public string Prioridad { get; set; } = "";
    public int IdResponsable { get; set; }
    public string? Responsable { get; set; }
    public string Estado { get; set; } = "";               // Activa | Cancelada
    /// <summary>Índice de la próxima ocurrencia por generar (el servicio de recordatorios extiende la serie con la misma regla).</summary>
    public int OcurrenciasGeneradas { get; set; }
    public int Total { get; set; }
    public int Completados { get; set; }
    /// <summary>Seguimientos aún abiertos (Pendiente + Atrasado).</summary>
    public int Pendientes { get; set; }
    public int Atrasados { get; set; }
    public int Cancelados { get; set; }
    /// <summary>Fecha del siguiente seguimiento que sigue Pendiente; null si no queda ninguno.</summary>
    public DateTime? ProximaFecha { get; set; }
    public string? MotivoCancelacion { get; set; }
    public DateTimeOffset? FechaCancelacion { get; set; }
    public int? IdUsuarioCancela { get; set; }
    public string? UsuarioCancela { get; set; }
    public DateTimeOffset FechaCreacion { get; set; }
    public string? CreadoPor { get; set; }
}

public class CrmSerieDetalleDto : CrmSerieDto
{
    public List<CrmSeguimientoDto> Seguimientos { get; set; } = new();
}

public class CrmSerieAccionDto
{
    public bool Aplicado { get; set; }
    public string Mensaje { get; set; } = "";
    public int SeguimientosCancelados { get; set; }
    public CrmSerieDetalleDto Serie { get; set; } = new();
}

public class CrmSerieFiltroDto
{
    public int? IdResponsable { get; set; }
    /// <summary>Activa | Cancelada.</summary>
    public string? Estado { get; set; }
    public string? Texto { get; set; }
}

public class CrearSerieDto
{
    public string? TipoEmpresa { get; set; }
    public int? IdEmpresa { get; set; }
    public int? IdContactoEmpresa { get; set; }
    public string? Periodicidad { get; set; }
    /// <summary>"yyyy-MM-dd".</summary>
    public string? FechaInicial { get; set; }
    /// <summary>"HH:mm".</summary>
    public string? Hora { get; set; }
    public string? Tipo { get; set; }
    public string? Motivo { get; set; }
    public string? Prioridad { get; set; }
    public int? IdResponsable { get; set; }
}

public class CancelarSerieDto
{
    public string? Motivo { get; set; }
}
