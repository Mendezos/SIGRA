namespace SIGRA.Abstracciones.Dtos;

// CRMGPSC-013 y 014: notas, interacciones e historial comercial

/// <summary>Datos para registrar una interacción. Fecha = hora de pared de Costa Rica, sin zona horaria ("2026-11-12T14:30:00").</summary>
public class RegistrarInteraccionDto
{
    public string? TipoEmpresa { get; set; }          // "Prospecto" | "Cliente"
    public int? IdEmpresa { get; set; }
    public int? IdContactoEmpresa { get; set; }
    public string? Tipo { get; set; }                 // CrmCatalogos.TiposInteraccion
    public DateTime? Fecha { get; set; }
    public string? Descripcion { get; set; }
    public string? Resultado { get; set; }
    public string? ProximoPaso { get; set; }
    public int? IdCotizacion { get; set; }
}

public class RegistrarNotaDto
{
    public string? TipoEmpresa { get; set; }
    public int? IdEmpresa { get; set; }
    public string? Categoria { get; set; }            // CrmCatalogos.CategoriasNota
    public string? Texto { get; set; }
    public string? Visibilidad { get; set; }          // Privada | Equipo | General (por defecto Equipo)
}

public class InteraccionRegistradaDto
{
    public int IdInteraccion { get; set; }
    public string Codigo => $"IN-{IdInteraccion:0000}";
    public string TipoEmpresa { get; set; } = string.Empty;
    public int IdEmpresa { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public DateTime Fecha { get; set; }
    public int? IdContactoEmpresa { get; set; }
    public string? Contacto { get; set; }
    public string? Descripcion { get; set; }
    public string? Resultado { get; set; }
    public string? ProximoPaso { get; set; }
    public int? IdCotizacion { get; set; }
    public int IdUsuario { get; set; }
    public string Autor { get; set; } = string.Empty;
    public DateTimeOffset FechaRegistro { get; set; }
}

public class NotaRegistradaDto
{
    public int IdNota { get; set; }
    public string Codigo => $"NT-{IdNota:0000}";
    public string TipoEmpresa { get; set; } = string.Empty;
    public int IdEmpresa { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string Texto { get; set; } = string.Empty;
    public string Visibilidad { get; set; } = string.Empty;
    public int IdUsuario { get; set; }
    public string Autor { get; set; } = string.Empty;
    public DateTimeOffset Fecha { get; set; }
}

/// <summary>Cotización de una empresa, para relacionarla con una interacción.</summary>
public class CrmCotizacionEmpresaDto
{
    public int IdCotizacion { get; set; }
    public string Codigo => $"COT-{IdCotizacion:0000}";
    public DateTime Fecha { get; set; }
    public decimal Monto { get; set; }
    public string Moneda { get; set; } = "CRC";
    public string Estado { get; set; } = string.Empty;
}

/// <summary>Un movimiento de la línea de tiempo comercial: interacción, nota o cotización. Fecha = hora de Costa Rica.</summary>
public class HistorialMovimientoDto
{
    public const string MovimientoInteraccion = "Interacción";
    public const string MovimientoNota = "Nota";
    public const string MovimientoCotizacion = "Cotización";

    public string TipoMovimiento { get; set; } = string.Empty;     // Interacción | Nota | Cotización
    public int IdMovimiento { get; set; }
    public string Codigo => TipoMovimiento switch
    {
        MovimientoInteraccion => $"IN-{IdMovimiento:0000}",
        MovimientoNota => $"NT-{IdMovimiento:0000}",
        _ => $"COT-{IdMovimiento:0000}"
    };
    public string Tipo { get; set; } = string.Empty;               // Llamada, Visita... | Nota | Cotización
    public DateTime Fecha { get; set; }
    public int? IdContactoEmpresa { get; set; }
    public string? Contacto { get; set; }
    public string? Categoria { get; set; }                         // solo notas
    public string? Visibilidad { get; set; }                       // solo notas
    public string? Descripcion { get; set; }
    public string? Resultado { get; set; }
    public string? ProximoPaso { get; set; }
    public int? IdCotizacion { get; set; }                         // cotización relacionada (o la propia en una cotización)
    public string? EstadoCotizacion { get; set; }
    public decimal? Monto { get; set; }
    public string? Moneda { get; set; }
    public int? IdAutor { get; set; }
    public string? Autor { get; set; }
}

public class HistorialAutorDto
{
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = string.Empty;
}

public class HistorialComercialDto
{
    public string TipoEmpresa { get; set; } = string.Empty;
    public int IdEmpresa { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public bool Activa { get; set; }
    /// <summary>Movimientos visibles para el usuario antes de aplicar los filtros (0 = la empresa no tiene actividad).</summary>
    public int TotalSinFiltros { get; set; }
    public List<HistorialMovimientoDto> Movimientos { get; set; } = new();
    public List<HistorialAutorDto> Autores { get; set; } = new();
}
