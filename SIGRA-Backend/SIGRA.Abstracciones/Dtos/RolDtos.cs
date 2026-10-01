namespace SIGRA.Abstracciones.Dtos;

public class CrearRolDto
{
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
}

public class EditarRolDto
{
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
}

public class CambiarEstadoRolDto
{
    public bool Activo { get; set; }
}

public class RolDto
{
    public int IdRol { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public bool Activo { get; set; }
}

public class ModuloDto
{
    public int IdModulo { get; set; }
    public string Nombre { get; set; } = string.Empty;
}
