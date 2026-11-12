namespace SIGRA.Abstracciones.Dtos;

public class EncuestaSatisfaccionDto
{
    public int IdEncuesta { get; set; }
    public int IdFactura { get; set; }
    public string NumeroFactura { get; set; } = string.Empty;
    public string Cliente { get; set; } = string.Empty;
    public string CorreoCliente { get; set; } = string.Empty;
    public DateTimeOffset FechaEnvio { get; set; }
    public DateTimeOffset FechaVencimiento { get; set; }
    public string Estado { get; set; } = "Enviada";
    public int? Calificacion { get; set; }
    public string Comentario { get; set; } = string.Empty;
    public DateTimeOffset? FechaRespuesta { get; set; }
    public bool AlertaBajaSatisfaccion { get; set; }
}

public class EncuestaPublicaDto
{
    public int IdEncuesta { get; set; }
    public string NumeroFactura { get; set; } = string.Empty;
    public string Cliente { get; set; } = string.Empty;
    public DateTimeOffset FechaVencimiento { get; set; }
}

public class ResponderEncuestaDto
{
    public int Calificacion { get; set; }
    public string Comentario { get; set; } = string.Empty;
}

public class RespuestaEncuestaResultadoDto
{
    public string Mensaje { get; set; } = string.Empty;
    public bool AlertaBajaSatisfaccion { get; set; }
}

public class ReenvioEncuestaResultadoDto
{
    public string Mensaje { get; set; } = string.Empty;
    public DateTimeOffset FechaVencimiento { get; set; }
}

public class EncuestaClienteHistorialDto
{
    public int IdEncuesta { get; set; }
    public int IdFactura { get; set; }
    public string NumeroFactura { get; set; } = string.Empty;
    public DateTime FechaEnvio { get; set; }
    public string Estado { get; set; } = string.Empty;
    public int? Calificacion { get; set; }
    public string Comentario { get; set; } = string.Empty;
}

public class HistorialClienteFinancieroDto
{
    public List<ContratoClienteDto> Contratos { get; set; } = new();
    public List<FacturaClienteDto> Facturas { get; set; } = new();
    public List<EncuestaClienteHistorialDto> Encuestas { get; set; } = new();
}
