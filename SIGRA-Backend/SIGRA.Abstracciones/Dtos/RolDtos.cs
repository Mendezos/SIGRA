namespace SIGRA.Abstracciones.Dtos;

public class CrearRolDto
{
    public string Nombre { get; set; } = string.Empty;
}

public class EditarRolDto
{
    public string Nombre { get; set; } = string.Empty;
}

public class RolDto
{
    public int IdRol { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public bool Activo { get; set; }
}
