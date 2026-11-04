namespace SIGRA.Abstracciones.Modelos;

/// <summary>Datos acordados de un contrato en borrador, ya validados por el flujo.</summary>
public class DatosContratoModel
{
    public string Empresa { get; set; } = string.Empty;
    public string? Contacto { get; set; }
    public string? Telefono { get; set; }
    public string? Correo { get; set; }
    public string? Direccion { get; set; }
    public int? IdPlantilla { get; set; }
    public int? VersionPlantilla { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime FechaVencimiento { get; set; }
    public DateTime? FechaFirma { get; set; }
    public decimal MontoMensual { get; set; }
    public string Moneda { get; set; } = "CRC";
    public string? Condiciones { get; set; }
    public string? ClausulasAdicionales { get; set; }
    public string? Responsabilidades { get; set; }
    public string? Penalizacion { get; set; }
    public int? IdVendedor { get; set; }
    public bool CubreReparaciones { get; set; }
    public int? IdContratoOrigen { get; set; }
}
