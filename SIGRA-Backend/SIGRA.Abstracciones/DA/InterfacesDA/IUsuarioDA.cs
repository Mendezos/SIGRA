using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Modelos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface IUsuarioDA
{
    Task<UsuarioModel?> ObtenerPorCorreoAsync(string correo);
    Task<UsuarioModel?> ObtenerPorIdAsync(int idUsuario);
    Task RegistrarLoginExitosoAsync(int idUsuario);
    Task<(int IntentosFallidos, bool CuentaBloqueada, DateTime? BloqueadoHasta)> RegistrarLoginFallidoAsync(int idUsuario, int maxIntentos, int minutosBloqueo);
    Task DesbloquearCuentaAsync(int idUsuario);
    Task ActualizarPasswordHashAsync(int idUsuario, string passwordHash);
    Task<List<UsuarioModel>> ObtenerBloqueadosAsync();
}

public interface IAuditoriaDA
{
    Task RegistrarAsync(int? idUsuario, string modulo, string entidad, int? idEntidad, string accion, string? detalle = null);
    Task<List<AuditoriaModel>> ObtenerRecientesPorUsuarioAsync(int idUsuario, int top = 20);
}

public interface ITokenRecuperacionDA
{
    Task CrearAsync(int idUsuario, string token, DateTime expira);
    Task<TokenRecuperacionModel?> ObtenerValidoAsync(string token);
    Task MarcarUsadoAsync(int idToken);
}

public interface IPoliticaSeguridadDA
{
    Task<PoliticaSeguridadModel?> ObtenerActivaAsync();
    Task<PoliticaSeguridadModel> CrearVersionAsync(PoliticaSeguridadModel nueva);
}

public interface ISesionDA
{
    Task CrearAsync(int idUsuario, string tokenId, DateTime fechaExpiracion);
    Task<SesionModel?> ObtenerActivaAsync(string tokenId);
    Task ActualizarActividadAsync(string tokenId);
    Task CerrarAsync(string tokenId);
    Task CerrarTodasDelUsuarioAsync(int idUsuario);
}

public interface IRolPermisoDA
{
    Task<List<PermisoModuloDto>> ObtenerPorRolAsync(int idRol);
}
