namespace SIGRA.Abstracciones.Dtos;

/// <summary>Empresa del CRM: un prospecto o un cliente (lista unificada para los selectores).</summary>
public class CrmEmpresaDto
{
    public string Tipo { get; set; } = "";          // "Prospecto" | "Cliente"
    public int IdEmpresa { get; set; }
    public string Empresa { get; set; } = "";
    public string? Contacto { get; set; }
    public string? Correo { get; set; }
    public string? Telefono { get; set; }
    public int? IdVendedor { get; set; }
    public string? Vendedor { get; set; }
    public string Estado { get; set; } = "";
    public bool Activa { get; set; }
}

/// <summary>Datos mínimos de una empresa del CRM para validar que exista y esté activa.</summary>
public class CrmEmpresaBasicaDto
{
    public string Tipo { get; set; } = "";
    public int IdEmpresa { get; set; }
    public string Empresa { get; set; } = "";
    public string Estado { get; set; } = "";
    public int? IdVendedor { get; set; }
    public bool Activa { get; set; }
}

/// <summary>Persona de contacto de una empresa, para los selectores de interacciones, seguimientos y series.</summary>
public class CrmContactoCatalogoDto
{
    public int IdContactoEmpresa { get; set; }
    public string Nombre { get; set; } = "";
    public string? Cargo { get; set; }
    public string? Telefono { get; set; }
    public string? Correo { get; set; }
    public string PreferenciaContacto { get; set; } = "Cualquiera";
    public bool EsPrincipal { get; set; }
    public bool Activo { get; set; }
}

/// <summary>
/// Valores permitidos de los catálogos del CRM. Son los mismos que validan las restricciones CHECK de la base de datos
/// y los que muestra el frontend (src/services/crmCatalogosService.js): si se cambia uno, hay que cambiarlo en los tres lugares.
/// </summary>
public static class CrmCatalogos
{
    public const string TipoProspecto = "Prospecto";
    public const string TipoCliente = "Cliente";
    public static readonly string[] TiposEmpresa = { TipoProspecto, TipoCliente };

    public static readonly string[] EstadosProspecto = { "Nuevo", "Cotización enviada", "En negociación", "Convertido", "Descartado" };
    public static readonly string[] FuentesProspecto = { "Referido", "Sitio web", "Llamada entrante", "Redes sociales", "Feria o evento", "Cliente existente", "Otra" };
    public static readonly string[] SectoresEmpresa = { "Turismo y hotelería", "Transporte", "Seguridad", "Construcción", "Industria", "Gobierno", "Agricultura", "Salud", "Educación", "Comercio", "Otro" };
    public static readonly string[] MotivosDescarte = { "Sin interés", "Precio", "Eligió a la competencia", "Sin presupuesto", "No contesta", "Datos incorrectos", "Otro" };

    public static readonly string[] PreferenciasContacto = { "Teléfono", "Correo", "Cualquiera" };

    public static readonly string[] TiposInteraccion = { "Llamada", "Correo", "Visita", "Reunión", "WhatsApp", "Acuerdo", "Otro" };
    public static readonly string[] CategoriasNota = { "General", "Comercial", "Técnica", "Facturación", "Otra" };
    public static readonly string[] VisibilidadesNota = { "Privada", "Equipo", "General" };

    public static readonly string[] TiposSeguimiento = { "Llamada", "Visita", "Correo", "Reunión", "WhatsApp", "Otro" };
    public static readonly string[] PrioridadesSeguimiento = { "Baja", "Media", "Alta" };
    public static readonly string[] EstadosSeguimiento = { "Pendiente", "Atrasado", "Completado", "Cancelado" };
    public static readonly string[] Periodicidades = { "Mensual", "Trimestral", "Semestral" };

    public static readonly string[] MediosAtencionBateria = { "Llamada", "Correo", "Visita", "WhatsApp", "Otro" };
    public const int MesesRecordatorioBateria = 11;
}
