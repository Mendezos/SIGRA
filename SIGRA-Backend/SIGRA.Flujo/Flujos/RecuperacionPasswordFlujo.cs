using Microsoft.Extensions.Configuration;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Servicios;
using SIGRA.Flujo.Utilidades;
using System.Security.Cryptography;

namespace SIGRA.Flujo.Flujos;

public class RecuperacionPasswordFlujo : IRecuperacionPasswordFlujo
{
    private readonly IUsuarioDA _usuarioDA;
    private readonly ITokenRecuperacionDA _tokenDA;
    private readonly IPoliticaSeguridadDA _politicaDA;
    private readonly ISesionDA _sesionDA;
    private readonly IAuditoriaDA _auditoriaDA;
    private readonly IPasswordHasher _hasher;
    private readonly IEmailService _email;
    private readonly string _frontendBaseUrl;

    public RecuperacionPasswordFlujo(
        IUsuarioDA usuarioDA, ITokenRecuperacionDA tokenDA, IPoliticaSeguridadDA politicaDA, ISesionDA sesionDA,
        IAuditoriaDA auditoriaDA, IPasswordHasher hasher, IEmailService email, IConfiguration configuracion)
    {
        _usuarioDA = usuarioDA;
        _tokenDA = tokenDA;
        _politicaDA = politicaDA;
        _sesionDA = sesionDA;
        _auditoriaDA = auditoriaDA;
        _hasher = hasher;
        _email = email;
        _frontendBaseUrl = (configuracion["Frontend:BaseUrl"] ?? "http://localhost:5173").TrimEnd('/');
    }

    public async Task SolicitarRecuperacionAsync(string correo)
    {
        correo = (correo ?? string.Empty).Trim();
        var usuario = await _usuarioDA.ObtenerPorCorreoAsync(correo);

        if (usuario is null || !usuario.Activo)
        {
            await Task.Delay(150);
            return;
        }

        var politica = await _politicaDA.ObtenerActivaAsync()
            ?? throw new ReglaNegocioException("No hay una política de seguridad configurada. Contacte a Administración.");

        var token = GenerarTokenSeguro();
        var expira = DateTime.UtcNow.AddMinutes(politica.VigenciaEnlaceMinutos);

        await _tokenDA.CrearAsync(usuario.IdUsuario, token, expira);
        await _auditoriaDA.RegistrarAsync(usuario.IdUsuario, "Autenticacion", "Usuario", usuario.IdUsuario, "RECUPERACION_SOLICITADA");

        try
        {
            var enlace = $"{_frontendBaseUrl}/restablecer-password?token={Uri.EscapeDataString(token)}";
            var cuerpo = $"<p>Hola {usuario.Nombre},</p><p>Recibimos una solicitud para restablecer tu contraseña de SIGRA.</p><p><a href=\"{enlace}\">Haz clic aquí para crear una nueva contraseña</a></p><p>Este enlace vence en {politica.VigenciaEnlaceMinutos} minutos y solo puede usarse una vez.</p><p>Si no solicitaste esto, ignora este correo.</p>";
            await _email.EnviarAsync(usuario.Correo, usuario.Nombre, "Recuperación de contraseña - SIGRA", cuerpo);
        }
        catch
        {
            await _auditoriaDA.RegistrarAsync(usuario.IdUsuario, "Autenticacion", "Usuario", usuario.IdUsuario, "RECUPERACION_EMAIL_FALLIDO");
        }
    }

    public async Task ValidarTokenAsync(string token)
    {
        var registro = await _tokenDA.ObtenerValidoAsync(token ?? string.Empty);
        if (registro is null)
            throw new ReglaNegocioException("El enlace está vencido o ya fue utilizado. Por favor genera una nueva solicitud.");
    }

    public async Task RestablecerPasswordAsync(string token, string nuevaPassword)
    {
        var registro = await _tokenDA.ObtenerValidoAsync(token ?? string.Empty)
            ?? throw new ReglaNegocioException("El enlace está vencido o ya fue utilizado. Por favor genera una nueva solicitud.");

        var politica = await _politicaDA.ObtenerActivaAsync()
            ?? throw new ReglaNegocioException("No hay una política de seguridad configurada. Contacte a Administración.");

        var errores = PoliticaPasswordValidador.Validar(nuevaPassword, politica.LongitudMinimaPassword);
        if (errores.Count > 0)
            throw new ValidacionException("La contraseña no cumple la política de seguridad.", errores);

        var hash = _hasher.Hash(nuevaPassword);
        await _usuarioDA.ActualizarPasswordHashAsync(registro.IdUsuario, hash);
        await _tokenDA.MarcarUsadoAsync(registro.IdToken);
        await _sesionDA.CerrarTodasDelUsuarioAsync(registro.IdUsuario);
        await _auditoriaDA.RegistrarAsync(registro.IdUsuario, "Autenticacion", "Usuario", registro.IdUsuario, "PASSWORD_RESTABLECIDA");
    }

    private static string GenerarTokenSeguro()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes).Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }
}
