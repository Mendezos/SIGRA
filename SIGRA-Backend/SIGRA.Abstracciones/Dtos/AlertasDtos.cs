namespace SIGRA.Abstracciones.Dtos;

// DAR-003, 018 y 019: alertas unificadas del sistema
public class AlertaDto
{
    public string Clave { get; set; } = "";
    public int IdModulo { get; set; }
    public string Categoria { get; set; } = "";
    public int Urgencia { get; set; }
    public string Titulo { get; set; } = "";
    public string Detalle { get; set; } = "";
    public int? IdResponsable { get; set; }
    public string? Responsable { get; set; }
    public DateTime? Fecha { get; set; }
    public string Entidad { get; set; } = "";
    public int? IdEntidad { get; set; }
    public bool PuedeAtender { get; set; }
}

public class AlertaAtendidaDto
{
    public string Clave { get; set; } = "";
    public int IdModulo { get; set; }
    public string Titulo { get; set; } = "";
    public string Nota { get; set; } = "";
    public string Usuario { get; set; } = "";
    public DateTime Fecha { get; set; }
}

public class ListadoAlertasDto
{
    public List<AlertaDto> Alertas { get; set; } = new();
    public List<AlertaAtendidaDto> Atendidas { get; set; } = new();
}

public class AtenderAlertaUnificadaDto
{
    public string? Clave { get; set; }
    public string? Nota { get; set; }
}

public class VistaFavoritaDto
{
    public int IdVista { get; set; }
    public string Nombre { get; set; } = "";
    public string Filtros { get; set; } = "";
}

public class GuardarVistaDto
{
    public string? Nombre { get; set; }
    public string? Filtros { get; set; }
}
