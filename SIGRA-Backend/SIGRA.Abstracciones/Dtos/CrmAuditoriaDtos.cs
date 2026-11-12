namespace SIGRA.Abstracciones.Dtos;

// CRMGPSC-026: historial de cambios del CRM para el administrador
public class FiltroAuditoriaCrmDto
{
    public string? Entidad { get; set; }
    public int? IdEntidad { get; set; }
    public int? IdAutor { get; set; }
    public string? Accion { get; set; }
    public string? Empresa { get; set; }
    public int? IdVendedor { get; set; }
    public DateTime? Desde { get; set; }
    public DateTime? Hasta { get; set; }
    public int Pagina { get; set; } = 1;
    public int TamanoPagina { get; set; } = 15;
}

public class EventoAuditoriaCrmDto
{
    public long IdAuditoria { get; set; }
    public string Entidad { get; set; } = "";
    public int? IdEntidad { get; set; }
    public string Accion { get; set; } = "";
    public string? Detalle { get; set; }
    public int? IdAutor { get; set; }
    public string Autor { get; set; } = "";
    public DateTime Fecha { get; set; }
    public string? Empresa { get; set; }
    public string? Vendedor { get; set; }
}

public class PaginaAuditoriaCrmDto
{
    public int Total { get; set; }
    public int Pagina { get; set; }
    public int TamanoPagina { get; set; }
    public List<EventoAuditoriaCrmDto> Items { get; set; } = new();
}

public class DetalleAuditoriaCrmDto
{
    public EventoAuditoriaCrmDto Evento { get; set; } = new();
    public List<EventoAuditoriaCrmDto> Relacionados { get; set; } = new();
}
