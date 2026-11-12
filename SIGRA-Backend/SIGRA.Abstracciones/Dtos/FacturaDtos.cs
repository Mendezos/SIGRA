namespace SIGRA.Abstracciones.Dtos;

public class LineaFacturaDto
{
    public string Descripcion { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Total => Cantidad * PrecioUnitario;
}

public class RegistrarFacturaDto
{
    public string Cliente { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public DateOnly? FechaEmision { get; set; }
    public List<LineaFacturaDto> Lineas { get; set; } = new();
}

public class FacturaDto
{
    public int IdUsuario { get; set; }
    public int IdFactura { get; set; }
    public int? IdCliente { get; set; }
    public string Numero { get; set; } = string.Empty;
    public string Cliente { get; set; } = string.Empty;
    public string CorreoCliente { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public DateOnly FechaEmision { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Impuesto { get; set; }
    public decimal Total { get; set; }
    public string EstadoCobro { get; set; } = "Pendiente";
    public DateOnly? FechaPago { get; set; }
    public string MetodoPago { get; set; } = string.Empty;
    public string ReferenciaPago { get; set; } = string.Empty;
    public DateOnly? FechaEsperadaPago { get; set; }
    public decimal? MontoPendiente { get; set; }
    public DateOnly? ProximaFechaRevision { get; set; }
    public string ObservacionCobro { get; set; } = string.Empty;
    public string MotivoIrregularidad { get; set; } = string.Empty;
    public List<LineaFacturaDto> Lineas { get; set; } = new();
}

public class CambiarEstadoCobroDto
{
    public string EstadoCobro { get; set; } = string.Empty;
    public DateOnly? FechaPago { get; set; }
    public string MetodoPago { get; set; } = string.Empty;
    public string ReferenciaPago { get; set; } = string.Empty;
    public DateOnly? FechaEsperadaPago { get; set; }
    public decimal? MontoPendiente { get; set; }
    public DateOnly? ProximaFechaRevision { get; set; }
    public string Observacion { get; set; } = string.Empty;
    public string Motivo { get; set; } = string.Empty;
}
