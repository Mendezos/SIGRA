namespace SIGRA.Abstracciones.Dtos;

public class UsuarioDto
{
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Correo { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public int IdRol { get; set; }
    public string Rol { get; set; } = string.Empty;
    public bool Activo { get; set; }
    public bool Bloqueada { get; set; }
}

public class CrearUsuarioDto
{
    public string Nombre { get; set; } = string.Empty;
    public string Correo { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public int? IdRol { get; set; }
    public string Password { get; set; } = string.Empty;
}

public class CambiarPasswordUsuarioDto
{
    public string PasswordNueva { get; set; } = string.Empty;
}
