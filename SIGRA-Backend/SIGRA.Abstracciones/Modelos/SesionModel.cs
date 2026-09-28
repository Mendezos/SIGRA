namespace SIGRA.Abstracciones.Modelos;

public class SesionModel
{
    public long IdSesion { get; set; }
    public int IdUsuario { get; set; }
    public string TokenId { get; set; } = string.Empty;
    public DateTime FechaInicio { get; set; }
    public DateTime FechaExpiracion { get; set; }
    public DateTime UltimaActividad { get; set; }
    public DateTime? FechaCierre { get; set; }
    public bool Activa { get; set; }
}