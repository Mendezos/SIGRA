namespace SIGRA.Abstracciones.Dtos;

public class LineaCotizacionDto
{
    public int IdProducto { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Total => Cantidad * PrecioUnitario;
}

public class RegistrarCotizacionDto
{
    public int IdProspecto { get; set; }
    public DateOnly? Fecha { get; set; }
    public List<LineaCotizacionDto> Lineas { get; set; } = new();
}

public class CotizacionDto
{
    public int IdUsuario { get; set; }
    public int IdCotizacion { get; set; }
    public int IdProspecto { get; set; }
    public DateOnly Fecha { get; set; }
    public decimal Monto { get; set; }
    public string Estado { get; set; } = string.Empty;
    public bool Activa { get; set; }
    public List<LineaCotizacionDto> Lineas { get; set; } = new();
}

public class CambiarEstadoCotizacionDto
{
    public string Estado { get; set; } = string.Empty;
}
