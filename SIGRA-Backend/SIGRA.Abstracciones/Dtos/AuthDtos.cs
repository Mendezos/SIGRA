namespace SIGRA.Abstracciones.Dtos;

public class LoginRequestDto
{
    public string Correo { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class PermisoModuloDto
{
    public int IdModulo { get; set; }
    public bool Lectura { get; set; }
    public bool Escritura { get; set; }
    public bool Edicion { get; set; }
    public bool Eliminacion { get; set; }
}

public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public DateTime Expira { get; set; }
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Correo { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public List<PermisoModuloDto> Permisos { get; set; } = new();
}

public class PerfilUsuarioDto
{
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Correo { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public List<PermisoModuloDto> Permisos { get; set; } = new();
}

public class SolicitarRecuperacionDto
{
    public string Correo { get; set; } = string.Empty;
}

public class RestablecerPasswordDto
{
    public string Token { get; set; } = string.Empty;
    public string NuevaPassword { get; set; } = string.Empty;
}

public class ConfigurarPoliticaDto
{
    public int? MinutosInactividad { get; set; }
    public int? MaxIntentosFallidos { get; set; }
    public int? LongitudMinimaPassword { get; set; }
    public int? MinutosBloqueo { get; set; }
    public int? VigenciaEnlaceMinutos { get; set; }
}

public class DesbloquearCuentaDto
{
    public string Motivo { get; set; } = string.Empty;
}

public class IntentoAuditoriaDto
{
    public DateTime Fecha { get; set; }
    public string Accion { get; set; } = string.Empty;
    public string? Detalle { get; set; }
}

public class EstadoCuentaDto
{
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Correo { get; set; } = string.Empty;
    public bool Activo { get; set; }
    public bool Bloqueada { get; set; }
    public int IntentosFallidos { get; set; }
    public DateTime? BloqueadoHasta { get; set; }
    public DateTime? FechaBloqueo { get; set; }
    public List<IntentoAuditoriaDto> IntentosRecientes { get; set; } = new();
}

public class RespuestaMensajeDto
{
    public string Mensaje { get; set; } = string.Empty;
}

public class RespuestaErrorDto
{
    public string Mensaje { get; set; } = string.Empty;
}

public class ActualizarPerfilDto
{
    public string Nombre { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public string? Foto { get; set; }
}

public class CambiarPasswordPropioDto
{
    public string PasswordActual { get; set; } = string.Empty;
    public string PasswordNueva { get; set; } = string.Empty;
}
