using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Modelos;

namespace SIGRA.Abstracciones.Flujo;

public interface IAutenticacionFlujo
{
    Task<LoginResponseDto> LoginAsync(string correo, string password);
    Task LogoutAsync(string tokenId);
    Task<PerfilUsuarioDto> ObtenerPerfilAsync(int idUsuario);
}

public interface IPoliticaSeguridadFlujo
{
    Task<PoliticaSeguridadModel> ObtenerActivaAsync();
    Task<PoliticaSeguridadModel> CrearNuevaVersionAsync(int minutosInactividad, int maxIntentosFallidos, int longitudMinimaPassword, int minutosBloqueo, int vigenciaEnlaceMinutos, int idUsuarioAdministrador);
}

public interface ICuentaFlujo
{
    Task<EstadoCuentaDto> ObtenerEstadoAsync(int idUsuario);
    Task<List<EstadoCuentaDto>> ObtenerCuentasBloqueadasAsync();
    Task DesbloquearCuentaAsync(int idUsuario, int idUsuarioAdministrador, string motivo);
}

public interface IRecuperacionPasswordFlujo
{
    Task SolicitarRecuperacionAsync(string correo);
    Task ValidarTokenAsync(string token);
    Task RestablecerPasswordAsync(string token, string nuevaPassword);
}
