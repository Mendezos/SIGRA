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

// DAR: panel de taller y boletas
public class AbiertasPorTipoDto
{
    public string Grupo { get; set; } = "";
    public int Abiertas { get; set; }
    public int SemanaAnterior { get; set; }
}

public class ReparacionAbiertaDto
{
    public int IdTicket { get; set; }
    public long NumeroBoleta { get; set; }
    public string Empresa { get; set; } = "";
    public string? Equipo { get; set; }
    public int? IdTecnico { get; set; }
    public string? Tecnico { get; set; }
    public string Etapa { get; set; } = "";
    public int Dias { get; set; }
    public bool Atrasada { get; set; }
}

public class RankingTecnicoDto
{
    public int IdTecnico { get; set; }
    public string Tecnico { get; set; } = "";
    public int Abiertas { get; set; }
    public int Limite { get; set; }
}

public class SolicitudPendienteDto
{
    public int IdTicket { get; set; }
    public long NumeroBoleta { get; set; }
    public string Empresa { get; set; } = "";
    public string TipoServicio { get; set; } = "";
    public DateTime Recibida { get; set; }
    public int Dias { get; set; }
}

public class CerradasMesDto
{
    public DateTime Mes { get; set; }
    public int Cerradas { get; set; }
    public int AnioAnterior { get; set; }
}

public class BoletaResueltaDto
{
    public int IdTicket { get; set; }
    public long NumeroBoleta { get; set; }
    public string Empresa { get; set; } = "";
    public string? Tecnico { get; set; }
    public string Resolucion { get; set; } = "";
    public DateTime Cerrada { get; set; }
}

public class CargaTecnicoDto
{
    public int IdTecnico { get; set; }
    public string Tecnico { get; set; } = "";
    public int Cerradas { get; set; }
    public int EnCurso { get; set; }
}

public class DashboardTallerDto
{
    public List<AbiertasPorTipoDto> Abiertas { get; set; } = new();
    public List<ReparacionAbiertaDto> Reparaciones { get; set; } = new();
    public List<RankingTecnicoDto> Ranking { get; set; } = new();
    public List<SolicitudPendienteDto> Solicitudes { get; set; } = new();
    public List<CerradasMesDto> CerradasPorMes { get; set; } = new();
    public List<BoletaResueltaDto> Resoluciones { get; set; } = new();
    public List<CargaTecnicoDto> Carga { get; set; } = new();
}
