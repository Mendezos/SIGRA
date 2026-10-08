namespace SIGRA.Abstracciones.Dtos;

public class CategoriaDto
{
    public int IdCategoria { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public bool ManejaCantidad { get; set; }
    public int CantidadMinima { get; set; }
}

public class ProveedorDto
{
    public int IdProveedor { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Contacto { get; set; }
    public string? Correo { get; set; }
    public string? Telefono { get; set; }
}

public class ModeloDto
{
    public int IdModelo { get; set; }
    public int IdCategoria { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string? DescripcionTecnica { get; set; }
}

public class EquipoListaDto
{
    public int IdEquipo { get; set; }
    public string NumeroSerie { get; set; } = string.Empty;
    public int IdModelo { get; set; }
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public int IdCategoria { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public string Propietario { get; set; } = string.Empty;
    public string? Ubicacion { get; set; }
    public DateTime FechaAdquisicion { get; set; }
    public decimal CostoCompra { get; set; }
    public int Cantidad { get; set; }
    public string Proveedor { get; set; } = string.Empty;
    public bool TieneFoto { get; set; }
}

public class EquipoDetalleDto
{
    public int IdEquipo { get; set; }
    public string NumeroSerie { get; set; } = string.Empty;
    public int IdModelo { get; set; }
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string? DescripcionTecnica { get; set; }
    public int IdCategoria { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public bool ManejaCantidad { get; set; }
    public string Estado { get; set; } = string.Empty;
    public string Propietario { get; set; } = string.Empty;
    public string? Ubicacion { get; set; }
    public DateTime FechaAdquisicion { get; set; }
    public decimal CostoCompra { get; set; }
    public int Cantidad { get; set; }
    public DateTime? FechaBaja { get; set; }
    public string? MotivoBaja { get; set; }
    public string? Foto { get; set; }
    public int IdProveedor { get; set; }
    public string Proveedor { get; set; } = string.Empty;
}

public class HistorialEquipoDto
{
    public DateTime Fecha { get; set; }
    public string Origen { get; set; } = string.Empty;
    public string Titulo { get; set; } = string.Empty;
    public string? Detalle { get; set; }
    public string? Usuario { get; set; }
}

public class FichaEquipoDto
{
    public EquipoDetalleDto Equipo { get; set; } = new();
    public List<HistorialEquipoDto> Historial { get; set; } = new();
}

public class RegistrarEquipoDto
{
    public int? IdCategoria { get; set; }
    public string? Marca { get; set; }
    public string? Modelo { get; set; }
    public string? DescripcionTecnica { get; set; }
    public string? NumeroSerie { get; set; }
    public int? IdProveedor { get; set; }
    public string? Propietario { get; set; }
    public string? Ubicacion { get; set; }
    public DateTime? FechaAdquisicion { get; set; }
    public decimal? CostoCompra { get; set; }
    public string? Foto { get; set; }
    public int? Cantidad { get; set; }
}

public class CambiarEstadoEquipoDto
{
    public string? Estado { get; set; }
    public string? Motivo { get; set; }
}

public class RegistrarMovimientoEquipoDto
{
    public int? IdEquipo { get; set; }
    public string? TipoMovimiento { get; set; }
    public int? Cantidad { get; set; }
    public string? Observacion { get; set; }
}

public class MovimientoDto
{
    public long IdMovimiento { get; set; }
    public int IdEquipo { get; set; }
    public string NumeroSerie { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string TipoMovimiento { get; set; } = string.Empty;
    public string? EstadoAnterior { get; set; }
    public string EstadoNuevo { get; set; } = string.Empty;
    public DateTime Fecha { get; set; }
    public string? Observacion { get; set; }
    public int Cantidad { get; set; }
    public string Usuario { get; set; } = string.Empty;
    public string Sentido { get; set; } = string.Empty;
}

public class StockCategoriaDto
{
    public int IdCategoria { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public int Total { get; set; }
    public int Disponibles { get; set; }
    public int EnUso { get; set; }
    public int EnTaller { get; set; }
    public int DadosDeBaja { get; set; }
    public int CantidadMinima { get; set; }
}

public class StockModeloDto
{
    public int IdModelo { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public int Total { get; set; }
    public int Disponibles { get; set; }
    public int EnUso { get; set; }
    public int EnTaller { get; set; }
    public int DadosDeBaja { get; set; }
}

public class GuardarStockMinimoDto
{
    public int? CantidadMinima { get; set; }
}

public class ArticuloBodegaDto
{
    public int Id { get; set; }
    public int IdModelo { get; set; }
    public string Modelo { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public int Cantidad { get; set; }
}

public class GuardarArticuloBodegaDto
{
    public int? IdModelo { get; set; }
    public string? Nombre { get; set; }
    public int? Cantidad { get; set; }
}
