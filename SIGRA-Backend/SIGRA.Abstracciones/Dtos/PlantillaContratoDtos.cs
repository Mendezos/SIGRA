namespace SIGRA.Abstracciones.Dtos;

public class PlantillaContratoDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public int? IdCategoria { get; set; }
    public string TipoEquipo { get; set; } = "";
    public int VersionActual { get; set; }
    public bool Activa { get; set; }
    public DateTime FechaCreacion { get; set; }
}

/// <summary>Plantilla con el contenido de una versión (por defecto la vigente) y su historial.</summary>
public class DetallePlantillaContratoDto : PlantillaContratoDto
{
    public int VersionMostrada { get; set; }
    public string Clausulas { get; set; } = "";
    public string Responsabilidades { get; set; } = "";
    public string? CondicionesCancelacion { get; set; }
    public List<VersionPlantillaContratoDto> Versiones { get; set; } = new();
    public List<CambioEstadoPlantillaDto> Cambios { get; set; } = new();
}

public class VersionPlantillaContratoDto
{
    public int Version { get; set; }
    public string? Motivo { get; set; }
    public string Usuario { get; set; } = "";
    public DateTime Fecha { get; set; }
}

public class CambioEstadoPlantillaDto
{
    public bool Activa { get; set; }
    public string? Motivo { get; set; }
    public string Usuario { get; set; } = "";
    public DateTime Fecha { get; set; }
}

/// <summary>Registro de una plantilla nueva (GCFS-001) o edición que genera una versión nueva (GCFS-003).</summary>
public class GuardarPlantillaContratoDto
{
    public string? Nombre { get; set; }
    public int? IdCategoria { get; set; }
    public string? Clausulas { get; set; }
    public string? Responsabilidades { get; set; }
    public string? CondicionesCancelacion { get; set; }
    public bool Activa { get; set; } = true;
    public string? Motivo { get; set; }
}

public class CambiarEstadoPlantillaDto
{
    public bool Activa { get; set; }
    public string? Motivo { get; set; }
}

public class ResultadoPlantillaContratoDto
{
    public DetallePlantillaContratoDto Plantilla { get; set; } = new();
    public string Mensaje { get; set; } = "";
}
