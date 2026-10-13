namespace SIGRA.Abstracciones.Dtos;

public class DatosCuentaDto
{
    public string Nombre { get; set; } = "";
    public string Correo { get; set; } = "";
    public DateTime? FechaNacimiento { get; set; }
    public string Telefono { get; set; } = "";
    public string Direccion { get; set; } = "";
    public string EstadoCivil { get; set; } = "";
    public string GradoAcademico { get; set; } = "";
    public decimal? Salario { get; set; }
}

public class CrearCuentaDto : DatosCuentaDto
{
    public string Cedula { get; set; } = "";
    public int IdRol { get; set; }
    public bool Activo { get; set; } = true;
    public string Password { get; set; } = "";
}

public class CambiarEstadoCuentaDto
{
    public bool Activo { get; set; }
    public int? IdRol { get; set; }
    public string? Motivo { get; set; }
}

public class CambiarRolCuentaDto
{
    public int IdRol { get; set; }
}

public class FiltroCuentasDto
{
    public string? Texto { get; set; }
    public int? IdRol { get; set; }
    public bool? Activo { get; set; }
    public bool? Bloqueada { get; set; }
    public int Pagina { get; set; } = 1;
    public int TamanoPagina { get; set; } = 10;
}

public class PaginaDto<T>
{
    public List<T> Items { get; set; } = new();
    public int Total { get; set; }
    public int Pagina { get; set; } = 1;
    public int TamanoPagina { get; set; } = 10;
}

public class ResumenCuentasDto
{
    public int UsuariosActivos { get; set; }
    public int UsuariosInactivos { get; set; }
    public int CuentasBloqueadas { get; set; }
    public int RolesDefinidos { get; set; }
    public int RolesActivos { get; set; }
    public int SesionesHoy { get; set; }
}

public class OpcionCuentaDto
{
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = "";
}

public class CuentaDto
{
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = "";
    public string Correo { get; set; } = "";
    public string? Cedula { get; set; }
    public DateTime? FechaNacimiento { get; set; }
    public string? Telefono { get; set; }
    public string? Direccion { get; set; }
    public string? EstadoCivil { get; set; }
    public string? GradoAcademico { get; set; }
    public decimal? Salario { get; set; }
    public int IdRol { get; set; }
    public string Rol { get; set; } = "";
    public bool Activo { get; set; }
    public bool Bloqueada { get; set; }
    public int IntentosFallidos { get; set; }
    public DateTime? BloqueadoHasta { get; set; }
    public DateTime? FechaCreacion { get; set; }
    public DateTime? UltimoAcceso { get; set; }
}

public class RolCuentaDto
{
    public int IdRol { get; set; }
    public string Nombre { get; set; } = "";
    public bool Activo { get; set; }
    public List<PermisoModuloDto> Permisos { get; set; } = new();
}

public class FiltroAuditoriaDto
{
    public string? Entidad { get; set; }
    public int? IdEntidad { get; set; }
    public int? IdUsuarioAfectado { get; set; }
    public int? IdAutor { get; set; }
    public DateTime? Desde { get; set; }
    public DateTime? Hasta { get; set; }
    public string? Accion { get; set; }
    public int Pagina { get; set; } = 1;
    public int TamanoPagina { get; set; } = 10;
}

public class RegistroAuditoriaDto
{
    public long IdAuditoria { get; set; }
    public int? IdAutor { get; set; }
    public string Autor { get; set; } = "";
    public int? IdUsuarioAfectado { get; set; }
    public string? Objetivo { get; set; }
    public string Modulo { get; set; } = "";
    public string Entidad { get; set; } = "";
    public int? IdEntidad { get; set; }
    public string Accion { get; set; } = "";
    public DateTime Fecha { get; set; }
    public string? Detalle { get; set; }
}

public record CambioCuenta(
    string Operacion, int IdAutor, int? IdUsuario = null,
    string? Nombre = null, string? Correo = null, string? Cedula = null,
    DateTime? FechaNacimiento = null, string? Telefono = null,
    string? Direccion = null, string? EstadoCivil = null,
    string? GradoAcademico = null, decimal? Salario = null,
    int? IdRol = null, bool? Activo = null, string? Motivo = null,
    string? PasswordHash = null);