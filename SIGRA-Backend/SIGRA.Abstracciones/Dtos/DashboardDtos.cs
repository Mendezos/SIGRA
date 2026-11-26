namespace SIGRA.Abstracciones.Dtos;

// DAR: panel de indicadores del inventario
public class IndicadoresInventarioDto
{
    public int Total { get; set; }
    public int Disponibles { get; set; }
    public int Alquilados { get; set; }
    public int EnTaller { get; set; }
    public int EnMantenimiento { get; set; }
    public int EnReparacion { get; set; }
    public int EnGarantia { get; set; }
    public int DadosDeBaja { get; set; }
    public int CambioAlquilados30 { get; set; }
    public int CambioDisponibles30 { get; set; }
}

public class CategoriaInventarioDto
{
    public int IdCategoria { get; set; }
    public string Categoria { get; set; } = "";
    public int Alquilados { get; set; }
    public int Disponibles { get; set; }
    public int EnTaller { get; set; }
}

public class EvolucionInventarioDto
{
    public DateTime Mes { get; set; }
    public int Alquilados { get; set; }
    public int Disponibles { get; set; }
}

public class StockMinimoDashboardDto
{
    public int IdCategoria { get; set; }
    public string Categoria { get; set; } = "";
    public int Minimo { get; set; }
    public int Disponibles { get; set; }
}

public class BateriaPorCambiarDto
{
    public string NumeroSerie { get; set; } = "";
    public string Modelo { get; set; } = "";
    public string Empresa { get; set; } = "";
    public DateTime FechaCambio { get; set; }
    public DateTime FechaVencimiento { get; set; }
    public string Estado { get; set; } = "";
}

public class ModeloFiltroDto
{
    public int IdCategoria { get; set; }
    public string Categoria { get; set; } = "";
    public int IdModelo { get; set; }
    public string Modelo { get; set; } = "";
}

public class DashboardInventarioDto
{
    public IndicadoresInventarioDto Indicadores { get; set; } = new();
    public List<CategoriaInventarioDto> PorCategoria { get; set; } = new();
    public List<EvolucionInventarioDto> Evolucion { get; set; } = new();
    public List<StockMinimoDashboardDto> Stock { get; set; } = new();
    public List<BateriaPorCambiarDto> Baterias { get; set; } = new();
    public List<ModeloFiltroDto> Modelos { get; set; } = new();
}
