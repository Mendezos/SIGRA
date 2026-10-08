namespace SIGRA.Abstracciones.Dtos;

public class VendedorDto
{
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = string.Empty;
}

public class ContactoDto
{
    public int IdContacto { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string? Contacto { get; set; }
    public string MedioContacto { get; set; } = string.Empty;
    public string DatoContacto { get; set; } = string.Empty;
    public string? Motivo { get; set; }
    public int? IdVendedor { get; set; }
    public string? Vendedor { get; set; }
    public string Estado { get; set; } = string.Empty;
    public DateTime FechaRegistro { get; set; }
    public string RegistradoPor { get; set; } = string.Empty;
}

public class ContactoHistorialDto
{
    public DateTime Fecha { get; set; }
    public string Usuario { get; set; } = string.Empty;
    public string? VendedorAnterior { get; set; }
    public string VendedorNuevo { get; set; } = string.Empty;
    public string Motivo { get; set; } = string.Empty;
}

public class ContactoRecienteDto
{
    public int IdContacto { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public DateTime FechaRegistro { get; set; }
    public string? Vendedor { get; set; }
}

public class SugerenciaContactoDto
{
    public VendedorDto? VendedorPrevio { get; set; }
    public ContactoRecienteDto? ContactoReciente { get; set; }
}

public class RegistrarContactoDto
{
    public string? Empresa { get; set; }
    public string? Contacto { get; set; }
    public string? MedioContacto { get; set; }
    public string? DatoContacto { get; set; }
    public string? Motivo { get; set; }
    public int? IdVendedor { get; set; }
    public bool ConfirmarDuplicado { get; set; }
}

public class RegistrarContactoResultadoDto
{
    public bool RequiereConfirmacion { get; set; }
    public ContactoRecienteDto? ContactoReciente { get; set; }
    public ContactoDto? Contacto { get; set; }
    public string Mensaje { get; set; } = string.Empty;
}

public class ReasignarContactoDto
{
    public int? IdVendedor { get; set; }
    public string? Motivo { get; set; }
}

public class DetalleContactoDto
{
    public ContactoDto Contacto { get; set; } = new();
    public List<ContactoHistorialDto> Historial { get; set; } = new();
}

public class ClienteDto
{
    public int IdCliente { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string? Contacto { get; set; }
    public string? Correo { get; set; }
    public string? Telefono { get; set; }
}

public class EquipoDisponibleDto
{
    public int IdEquipo { get; set; }
    public string NumeroSerie { get; set; } = string.Empty;
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string? Ubicacion { get; set; }
}

public class RegistrarContratoDto
{
    public string? Empresa { get; set; }
    public DateTime? FechaInicio { get; set; }
    public DateTime? FechaVencimiento { get; set; }
    public decimal? MontoMensual { get; set; }
    public string? Condiciones { get; set; }
    public List<string>? Series { get; set; }
}

public class ContratoDto
{
    public int IdContrato { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public string EstadoRegistrado { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public DateTime FechaInicio { get; set; }
    public DateTime FechaVencimiento { get; set; }
    public decimal MontoMensual { get; set; }
    public string? Condiciones { get; set; }
    public int? IdVendedor { get; set; }
    public string? Vendedor { get; set; }
    public int CantidadEquipos { get; set; }
    public string Series { get; set; } = string.Empty;
}

public class ContratoEquipoDto
{
    public int IdEquipo { get; set; }
    public string NumeroSerie { get; set; } = string.Empty;
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public DateTime FechaAsignacion { get; set; }
}

public class DetalleContratoDto
{
    public ContratoDto Contrato { get; set; } = new();
    public List<ContratoEquipoDto> Equipos { get; set; } = new();
}

public class AgregarRadioDto
{
    public int? IdContrato { get; set; }
    public string? NumeroSerie { get; set; }
    public DateTime? FechaAsignacion { get; set; }
}

public class RadioDto
{
    public int IdEquipo { get; set; }
    public string NumeroSerie { get; set; } = string.Empty;
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public string? Ubicacion { get; set; }
    public int IdContrato { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public DateTime FechaAsignacion { get; set; }
    public DateTime? UltimoCambioBateria { get; set; }
}
