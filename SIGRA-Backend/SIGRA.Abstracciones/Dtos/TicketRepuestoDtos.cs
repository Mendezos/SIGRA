namespace SIGRA.Abstracciones.Dtos;

/// <summary>Repuesto que el técnico usó en una boleta.</summary>
public class RepuestoTicketDto
{
    public int IdTicketRepuesto { get; set; }
    public int IdRepuesto { get; set; }
    public string Nombre { get; set; } = "";
    public string Modelo { get; set; } = "";
    public int Cantidad { get; set; }
    public string Usuario { get; set; } = "";
    public DateTime Fecha { get; set; }
}

/// <summary>Repuesto de bodega con existencias que se puede usar en una reparación.</summary>
public class RepuestoDisponibleDto
{
    public int Id { get; set; }
    public int IdModelo { get; set; }
    public string Modelo { get; set; } = "";
    public string Nombre { get; set; } = "";
    public int Cantidad { get; set; }
}

public class UsarRepuestoTicketDto
{
    public int IdRepuesto { get; set; }
    public int Cantidad { get; set; }
}
