using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Modelos;

public class AccesoModuloModel
{
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = "";
    public string Correo { get; set; } = "";
    public string Rol { get; set; } = "";
    public bool Interno { get; set; }
    public bool Lectura { get; set; }
    public bool Escritura { get; set; }
    public bool Edicion { get; set; }
    public bool Eliminacion { get; set; }
}

public class CambioTicket
{
    public string Operacion { get; set; } = "";
    public int IdTicket { get; set; }
    public int IdUsuario { get; set; }
    public byte[]? Version { get; set; }
    public string Datos { get; set; } = "{}";
    public string? Antes { get; set; }
    public string? Resumen { get; set; }
}

public class TicketFilaModel : TicketDetalleDto
{
    public byte[] VersionBytes { get; set; } = Array.Empty<byte>();
    public string? TrabajoJson { get; set; }
}

public class EquipoContratoModel
{
    public int IdEquipo { get; set; }
    public string NumeroSerie { get; set; } = "";
    public int? IdContrato { get; set; }
    public int? IdCliente { get; set; }
    public bool CubreReparaciones { get; set; }
    public string Estado { get; set; } = "";
}
