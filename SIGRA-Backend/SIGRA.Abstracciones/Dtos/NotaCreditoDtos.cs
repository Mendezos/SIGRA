namespace SIGRA.Abstracciones.Dtos;

public class RegistrarNotaCreditoDto
{
    public int IdFactura { get; set; }
    public DateOnly? FechaEmision { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public decimal Monto { get; set; }
}

public class NotaCreditoDto
{
    public int IdUsuario { get; set; }
    public int IdNotaCredito { get; set; }
    public string Numero { get; set; } = string.Empty;
    public int IdFactura { get; set; }
    public string Factura { get; set; } = string.Empty;
    public string Cliente { get; set; } = string.Empty;
    public DateOnly FechaEmision { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public decimal Monto { get; set; }
    public string Estado { get; set; } = "Pendiente";

    // Datos de la factura asociada: sin ellos el detalle de la nota no muestra el alcance del ajuste.
    public string FacturaTipo { get; set; } = string.Empty;
    public DateOnly FacturaFechaEmision { get; set; }
    public string FacturaMoneda { get; set; } = "CRC";
    public decimal FacturaTotal { get; set; }
    public string FacturaEstado { get; set; } = string.Empty;
    public string FacturaEstadoCobro { get; set; } = string.Empty;
    public decimal? FacturaMontoPendiente { get; set; }

    // Auditoría: quién registró la nota y cuándo quedó en el sistema.
    public string UsuarioRegistra { get; set; } = string.Empty;
    public DateTime? FechaRegistro { get; set; }
}
