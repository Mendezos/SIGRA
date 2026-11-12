using System.Text.Json.Serialization;

namespace SIGRA.Abstracciones.Dtos;

// CRMGPSC-025 y T-02: recordatorios de baterías y servicio de recordatorios

/// <summary>Modelo de batería del catálogo (ModeloEquipo con categoría «Batería»).</summary>
public class BateriaModeloDto
{
    public int IdModelo { get; set; }
    public string Marca { get; set; } = "";
    public string Modelo { get; set; } = "";
    public string Nombre { get; set; } = "";
}

/// <summary>
/// Recordatorio de reemplazo de una batería comprada por un cliente (BT-0001). Las fechas de compra y de recordatorio son fechas
/// de Costa Rica; las marcas del sistema (FechaNotificacion, FechaAtencion, FechaCierre, FechaCreacion) vienen en UTC.
/// </summary>
public class RecordatorioBateriaDto
{
    public int IdRecordatorio { get; set; }
    public string Codigo => $"BT-{IdRecordatorio:0000}";
    public int IdCliente { get; set; }
    public string Cliente { get; set; } = "";
    public int? IdContactoEmpresa { get; set; }
    /// <summary>Contacto elegido en la compra o, si no se eligió, el contacto principal activo del cliente.</summary>
    public string? Contacto { get; set; }
    public string? ContactoTelefono { get; set; }
    public string? ContactoCorreo { get; set; }
    public int? IdFactura { get; set; }
    public string? NumeroFactura { get; set; }
    public int? IdModelo { get; set; }
    public string ModeloBateria { get; set; } = "";
    public int Cantidad { get; set; }
    public DateTime FechaCompra { get; set; }
    public DateTime FechaRecordatorio { get; set; }
    public int IdVendedor { get; set; }
    public string Vendedor { get; set; } = "";
    public bool VendedorActivo { get; set; }
    /// <summary>Pendiente | Notificado | Atendido | Cerrado.</summary>
    public string Estado { get; set; } = "";
    /// <summary>Días desde hoy (hora de Costa Rica) hasta la fecha de recordatorio; negativo = vencido.</summary>
    public int DiasRestantes { get; set; }
    /// <summary>Pendiente o Notificado: el recordatorio sigue abierto y se puede atender.</summary>
    public bool Abierto => Estado is "Pendiente" or "Notificado";
    public DateTimeOffset? FechaNotificacion { get; set; }
    public DateTimeOffset? FechaAtencion { get; set; }
    public string? MedioAtencion { get; set; }
    public string? ResultadoAtencion { get; set; }
    public string? ObservacionAtencion { get; set; }
    public string? ProximoPasoAtencion { get; set; }
    public int? IdUsuarioAtencion { get; set; }
    public string? UsuarioAtencion { get; set; }
    /// <summary>Recordatorio que reemplazó a este (cambio anticipado) cuando está cerrado.</summary>
    public int? IdRecordatorioNuevo { get; set; }
    public string? MotivoCierre { get; set; }
    public DateTimeOffset? FechaCierre { get; set; }
    public DateTimeOffset FechaCreacion { get; set; }

    [JsonIgnore]
    public string? IdsReemplazados { get; set; }

    /// <summary>Recordatorios anteriores que esta compra cerró por cambio anticipado.</summary>
    public List<int> Reemplaza => string.IsNullOrWhiteSpace(IdsReemplazados)
        ? new List<int>()
        : IdsReemplazados.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(int.Parse).ToList();
}

/// <summary>Datos de la compra de una batería. Todo es opcional en el JSON para poder avisar qué campos faltan.</summary>
public class RegistrarCompraBateriaDto
{
    public int? IdCliente { get; set; }
    public int? IdContactoEmpresa { get; set; }
    public int? IdFactura { get; set; }
    public string? NumeroFactura { get; set; }
    public int? IdModelo { get; set; }
    public string? ModeloBateria { get; set; }
    public int? Cantidad { get; set; }
    public DateTime? FechaCompra { get; set; }
    public int? IdVendedor { get; set; }
}

public class BateriaRegistroResultadoDto
{
    public RecordatorioBateriaDto Recordatorio { get; set; } = new();
    /// <summary>Recordatorios anteriores del mismo cliente y batería que se cerraron (cambio anticipado).</summary>
    public List<int> Cerrados { get; set; } = new();
    public string Mensaje { get; set; } = "";
}

public class AtenderBateriaDto
{
    public string? Medio { get; set; }
    public string? Resultado { get; set; }
    public string? Observacion { get; set; }
    public string? ProximoPaso { get; set; }
}

public class BateriaAtencionResultadoDto
{
    public RecordatorioBateriaDto Recordatorio { get; set; } = new();
    /// <summary>false = el recordatorio ya estaba Atendido o Cerrado y no se modificó.</summary>
    public bool Aplicado { get; set; }
    public string Mensaje { get; set; } = "";
}

/// <summary>Resultado, por batería, de generar los recordatorios de una factura (Resultado: Creado | Existente | Omitido).</summary>
public class BateriaFacturaResultadoDto
{
    public int IdFactura { get; set; }
    public string? NumeroFactura { get; set; }
    public int? IdModelo { get; set; }
    public string ModeloBateria { get; set; } = "";
    public decimal Cantidad { get; set; }
    public int? IdRecordatorio { get; set; }
    public string Resultado { get; set; } = "";
    public string? Motivo { get; set; }
}

/// <summary>Contadores de una vuelta del servicio de recordatorios.</summary>
public class ResumenProcesoRecordatoriosDto
{
    public int SeguimientosAtrasados { get; set; }
    public int AlertasSeguimiento { get; set; }
    public int SeriesExtendidas { get; set; }
    public int OcurrenciasCreadas { get; set; }
    public int BateriasNotificadas { get; set; }
    /// <summary>Avisos o series que fallaron en esta vuelta (se reintentan en la siguiente).</summary>
    public int Errores { get; set; }

    [JsonIgnore]
    public bool HuboCambios => SeguimientosAtrasados > 0 || AlertasSeguimiento > 0 || SeriesExtendidas > 0 || OcurrenciasCreadas > 0 || BateriasNotificadas > 0 || Errores > 0;

    public string Mensaje => HuboCambios
        ? $"{SeguimientosAtrasados} seguimiento(s) marcado(s) como atrasado(s), {AlertasSeguimiento} aviso(s) de seguimiento, " +
          $"{OcurrenciasCreadas} ocurrencia(s) nueva(s) en {SeriesExtendidas} serie(s) y {BateriasNotificadas} aviso(s) de batería" +
          (Errores > 0 ? $". Hubo {Errores} error(es) que se reintentarán en la siguiente revisión." : ".")
        : "No había nada pendiente por avisar.";
}

/// <summary>Contadores para el tablero del vendedor.</summary>
public class ResumenRecordatoriosDto
{
    public int BateriasHoy { get; set; }
    public int BateriasVencidas { get; set; }
    public int BateriasProximas { get; set; }
    public int SeguimientosAtrasados { get; set; }
    public int SeguimientosHoy { get; set; }
}
