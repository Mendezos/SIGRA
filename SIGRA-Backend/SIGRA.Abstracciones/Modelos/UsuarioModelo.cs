namespace SIGRA.Abstracciones.Modelos;

public class UsuarioModel
{
    public int IdUsuario { get; set; }
    public int IdRol { get; set; }
    public string NombreRol { get; set; } = string.Empty;
    public int? IdCliente { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Correo { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string? Foto { get; set; }
    public bool Activo { get; set; }
    public int IntentosFallidos { get; set; }
    public DateTime? BloqueadoHasta { get; set; }
    public DateTime? FechaBloqueo { get; set; }
}