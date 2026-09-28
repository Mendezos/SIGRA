namespace SIGRA.Abstracciones.Modelos;

public class AuditoriaModel
{
    public long IdAuditoria { get; set; }
    public int? IdUsuario { get; set; }
    public string Modulo { get; set; } = string.Empty;
    public string Entidad { get; set; } = string.Empty;
    public int? IdEntidad { get; set; }
    public string Accion { get; set; } = string.Empty;
    public DateTime Fecha { get; set; }
    public string? Detalle { get; set; }
}
