namespace SIGRA.Abstracciones.Dtos;

// CRMGPSC-019 a 021: conversión de prospectos, responsable comercial y perfil del cliente.

public class ClienteCrmDto
{
    public int IdCliente { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string? Contacto { get; set; }
    public string? Correo { get; set; }
    public string? Telefono { get; set; }
    public string? Sector { get; set; }
    public bool Activo { get; set; }
    public int? IdVendedor { get; set; }
    public string? Vendedor { get; set; }
    public int ContratosVigentes { get; set; }
    public int TicketsAbiertos { get; set; }
}

public class ClienteEmpresaDto
{
    public int IdCliente { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string? Contacto { get; set; }
    public string? Correo { get; set; }
    public string? Telefono { get; set; }
    public string? Sector { get; set; }
    public string? Direccion { get; set; }
    public int? TamanoFlota { get; set; }
    public bool Activo { get; set; }
    public string? MotivoInactivacion { get; set; }
    public int? IdVendedor { get; set; }
    public string? Vendedor { get; set; }
    public bool VendedorActivo { get; set; }
    public DateTimeOffset FechaRegistro { get; set; }
    public int? IdProspectoOrigen { get; set; }
}

public class ResponsableCambioDto
{
    public int IdCambio { get; set; }
    public string? VendedorAnterior { get; set; }
    public string VendedorNuevo { get; set; } = string.Empty;
    public string? Motivo { get; set; }
    public int SeguimientosMovidos { get; set; }
    public string? Usuario { get; set; }
    public DateTimeOffset Fecha { get; set; }
}

public class VentaClienteDto
{
    public string Origen { get; set; } = string.Empty;
    public DateTime Fecha { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public decimal Monto { get; set; }
    public string Moneda { get; set; } = "CRC";
}

public class EquipoClienteDto
{
    public int IdEquipo { get; set; }
    public string NumeroSerie { get; set; } = string.Empty;
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public int IdContrato { get; set; }
    public DateTime FechaAsignacion { get; set; }
}

public class ContratoClienteDto
{
    public int IdContrato { get; set; }
    public string Estado { get; set; } = string.Empty;
    public DateTime FechaInicio { get; set; }
    public DateTime FechaVencimiento { get; set; }
    public decimal MontoMensual { get; set; }
    public string Moneda { get; set; } = "CRC";
    public int CantidadEquipos { get; set; }
}

public class FrecuenciaClienteDto
{
    public int IdSolicitud { get; set; }
    public string Estado { get; set; } = string.Empty;
    public string? Frecuencia { get; set; }
    public string? Banda { get; set; }
    public DateTime? FechaVencimiento { get; set; }
    public string NumeroSerie { get; set; } = string.Empty;
}

public class TicketClienteDto
{
    public int IdTicket { get; set; }
    public long NumeroBoleta { get; set; }
    public string TipoServicio { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public DateTimeOffset FechaRecepcion { get; set; }
}

public class FacturaClienteDto
{
    public int IdFactura { get; set; }
    public string NumeroFactura { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public DateTime Fecha { get; set; }
    public decimal Total { get; set; }
    public string Moneda { get; set; } = "CRC";
    public string Estado { get; set; } = string.Empty;
    public string EstadoCobro { get; set; } = string.Empty;
}

/// <summary>Una sección del perfil: si el rol no la puede ver llega Visible = false; si no tiene registros, Items vacío y un mensaje.</summary>
public class SeccionPerfilDto<T>
{
    public bool Visible { get; set; } = true;
    public string? Mensaje { get; set; }
    public List<T> Items { get; set; } = new();
}

public class PerfilClienteDto
{
    public ClienteEmpresaDto Cliente { get; set; } = new();
    public SeccionPerfilDto<ProspectoContactoDto> Contactos { get; set; } = new();
    public SeccionPerfilDto<ResponsableCambioDto> Responsables { get; set; } = new();
    public SeccionPerfilDto<VentaClienteDto> Ventas { get; set; } = new();
    public SeccionPerfilDto<EquipoClienteDto> Equipos { get; set; } = new();
    public SeccionPerfilDto<ContratoClienteDto> Contratos { get; set; } = new();
    public SeccionPerfilDto<FrecuenciaClienteDto> Frecuencias { get; set; } = new();
    public SeccionPerfilDto<TicketClienteDto> Tickets { get; set; } = new();
    public SeccionPerfilDto<FacturaClienteDto> Facturas { get; set; } = new();
    public SeccionPerfilDto<ProspectoCotizacionDto> Cotizaciones { get; set; } = new();
    public SeccionPerfilDto<ProspectoNotaDto> Notas { get; set; } = new();
    public SeccionPerfilDto<ProspectoInteraccionDto> Interacciones { get; set; } = new();
    public SeccionPerfilDto<ProspectoSeguimientoDto> Seguimientos { get; set; } = new();
}

// ---------- Conversión de prospecto en cliente ----------
public class VentaInicialDto
{
    public string? Producto { get; set; }
    public int? Cantidad { get; set; }
    public decimal? Monto { get; set; }
    public string? Moneda { get; set; }
    public DateTime? Fecha { get; set; }
}

public class ConvertirProspectoDto
{
    public VentaInicialDto? VentaInicial { get; set; }
    /// <summary>Cliente existente con el que se vincula el prospecto en lugar de crear uno nuevo.</summary>
    public int? IdClienteExistente { get; set; }
}

public class ConvertirProspectoResultadoDto
{
    /// <summary>"Convertido" | "RequiereVinculo" (hay clientes que coinciden y hay que elegir uno o confirmar que es nuevo).</summary>
    public string Resultado { get; set; } = "Convertido";
    public int? IdCliente { get; set; }
    public string Mensaje { get; set; } = string.Empty;
    public List<CoincidenciaProspectoDto> Coincidencias { get; set; } = new();
}

// ---------- Responsable comercial ----------
public class AsignarResponsableDto
{
    public int? IdVendedor { get; set; }
    public string? Motivo { get; set; }
}

public class AsignarResponsableResultadoDto
{
    public bool Cambio { get; set; }
    public string Mensaje { get; set; } = string.Empty;
    public int? IdVendedorAnterior { get; set; }
    public int SeguimientosMovidos { get; set; }
}
