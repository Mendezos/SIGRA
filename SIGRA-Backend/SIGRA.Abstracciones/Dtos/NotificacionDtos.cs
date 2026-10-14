namespace SIGRA.Abstracciones.Dtos;

public class NotificacionDto
{
    public long IdNotificacion { get; set; }
    public string Titulo { get; set; } = "";
    public string Mensaje { get; set; } = "";
    public int IdModulo { get; set; }
    public string? Entidad { get; set; }
    public int? IdEntidad { get; set; }
    public DateTimeOffset Fecha { get; set; }
    public DateTimeOffset? FechaLectura { get; set; }
    public string? EstadoCorreo { get; set; }
}

public class AdjuntoCorreoDto
{
    public string Nombre { get; set; } = "";
    public string TipoContenido { get; set; } = "application/pdf";
    public byte[] Contenido { get; set; } = Array.Empty<byte>();
}

public class CorreoPendienteDto
{
    public long IdCorreo { get; set; }
    public string Destinatario { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Asunto { get; set; } = "";
    public string Cuerpo { get; set; } = "";
    public string AdjuntosJson { get; set; } = "[]";
    public int Intentos { get; set; }
}
