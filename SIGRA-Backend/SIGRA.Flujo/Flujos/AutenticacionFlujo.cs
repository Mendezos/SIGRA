using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Servicios;

namespace SIGRA.Flujo.Flujos;

public class AutenticacionFlujo : IAutenticacionFlujo
{
    private const string MensajeGenericoLogin = "El correo o la contraseña son incorrectos.";

    private readonly IUsuarioDA _usuarioDA;
    private readonly ISesionDA _sesionDA;
    private readonly IRolPermisoDA _rolPermisoDA;
    private readonly IPoliticaSeguridadDA _politicaDA;
    private readonly IAuditoriaDA _auditoriaDA;
    private readonly IPasswordHasher _hasher;
    private readonly IJwtService _jwt;
    private readonly IEmailService _email;

    public AutenticacionFlujo(
        IUsuarioDA usuarioDA, ISesionDA sesionDA, IRolPermisoDA rolPermisoDA, IPoliticaSeguridadDA politicaDA,
        IAuditoriaDA auditoriaDA, IPasswordHasher hasher, IJwtService jwt, IEmailService email)
    {
        _usuarioDA = usuarioDA;
        _sesionDA = sesionDA;
        _rolPermisoDA = rolPermisoDA;
        _politicaDA = politicaDA;
        _auditoriaDA = auditoriaDA;
        _hasher = hasher;
        _jwt = jwt;
        _email = email;
    }

    public async Task<LoginResponseDto> LoginAsync(string correo, string password)
    {
        correo = (correo ?? string.Empty).Trim();

        var usuario = await _usuarioDA.ObtenerPorCorreoAsync(correo);
        if (usuario is null)
        {
            await _auditoriaDA.RegistrarAsync(null, "Autenticacion", "Usuario", null, "LOGIN_FALLIDO", $"Correo no registrado: {correo}");
            throw new ReglaNegocioException(MensajeGenericoLogin);
        }

        var politica = await _politicaDA.ObtenerActivaAsync()
            ?? throw new ReglaNegocioException("No hay una política de seguridad configurada. Contacte a Administración.");

        var ahora = DateTime.UtcNow;

        if (usuario.BloqueadoHasta.HasValue && usuario.BloqueadoHasta.Value <= ahora)
        {
            await _usuarioDA.DesbloquearCuentaAsync(usuario.IdUsuario);
            usuario.BloqueadoHasta = null;
            usuario.FechaBloqueo = null;
            usuario.IntentosFallidos = 0;
        }

        if (usuario.BloqueadoHasta.HasValue && usuario.BloqueadoHasta.Value > ahora)
        {
            var minutosRestantes = Math.Max(1, (int)Math.Ceiling((usuario.BloqueadoHasta.Value - ahora).TotalMinutes));
            await _auditoriaDA.RegistrarAsync(usuario.IdUsuario, "Autenticacion", "Usuario", usuario.IdUsuario, "LOGIN_BLOQUEADO");
            throw new CuentaBloqueadaException($"Su cuenta está bloqueada. Intente nuevamente en {minutosRestantes} minuto(s).", minutosRestantes);
        }

        var passwordValida = _hasher.Verificar(password ?? string.Empty, usuario.PasswordHash);
        if (!passwordValida)
        {
            var resultado = await _usuarioDA.RegistrarLoginFallidoAsync(usuario.IdUsuario, politica.MaxIntentosFallidos, politica.MinutosBloqueo);
            await _auditoriaDA.RegistrarAsync(usuario.IdUsuario, "Autenticacion", "Usuario", usuario.IdUsuario, "LOGIN_FALLIDO");

            if (resultado.CuentaBloqueada)
            {
                await _auditoriaDA.RegistrarAsync(usuario.IdUsuario, "Autenticacion", "Usuario", usuario.IdUsuario, "CUENTA_BLOQUEADA");
                await NotificarBloqueoAsync(usuario.Correo, usuario.Nombre, resultado.BloqueadoHasta);
            }

            throw new ReglaNegocioException(MensajeGenericoLogin);
        }

        if (!usuario.Activo)
        {
            await _auditoriaDA.RegistrarAsync(usuario.IdUsuario, "Autenticacion", "Usuario", usuario.IdUsuario, "LOGIN_CUENTA_INACTIVA");
            throw new ReglaNegocioException("Su cuenta está inactiva. Por favor contacte a Administración.");
        }

        await _usuarioDA.RegistrarLoginExitosoAsync(usuario.IdUsuario);

        var (token, jti, expira) = _jwt.GenerarToken(usuario.IdUsuario, usuario.Nombre, usuario.NombreRol);
        await _sesionDA.CrearAsync(usuario.IdUsuario, jti, expira);
        await _auditoriaDA.RegistrarAsync(usuario.IdUsuario, "Autenticacion", "Usuario", usuario.IdUsuario, "LOGIN_EXITOSO");

        var permisos = await _rolPermisoDA.ObtenerPorRolAsync(usuario.IdRol);

        return new LoginResponseDto
        {
            Token = token,
            Expira = expira,
            IdUsuario = usuario.IdUsuario,
            Nombre = usuario.Nombre,
            Correo = usuario.Correo,
            Rol = usuario.NombreRol,
            Permisos = permisos
        };
    }

    public async Task LogoutAsync(string tokenId)
    {
        var sesion = await _sesionDA.ObtenerActivaAsync(tokenId)
            ?? throw new SesionInvalidaException("Su sesión ya no está activa o expiró. Inicie sesión nuevamente.");

        await _sesionDA.CerrarAsync(tokenId);
        await _auditoriaDA.RegistrarAsync(sesion.IdUsuario, "Autenticacion", "Sesion", (int)sesion.IdSesion, "LOGOUT");
    }

    public async Task<PerfilUsuarioDto> ObtenerPerfilAsync(int idUsuario)
    {
        var usuario = await _usuarioDA.ObtenerPorIdAsync(idUsuario)
            ?? throw new SesionInvalidaException("El usuario asociado a la sesión ya no existe.");

        if (!usuario.Activo)
            throw new SesionInvalidaException("Su cuenta está inactiva. Por favor contacte a Administración.");

        var permisos = await _rolPermisoDA.ObtenerPorRolAsync(usuario.IdRol);

        return new PerfilUsuarioDto
        {
            IdUsuario = usuario.IdUsuario,
            Nombre = usuario.Nombre,
            Correo = usuario.Correo,
            Rol = usuario.NombreRol,
            Permisos = permisos
        };
    }

    private async Task NotificarBloqueoAsync(string correo, string nombre, DateTime? bloqueadoHasta)
    {
        try
        {
            var horaDesbloqueo = bloqueadoHasta?.ToString("dd/MM/yyyy HH:mm 'UTC'") ?? "próximamente";
            var cuerpo = $"<p>Hola {nombre},</p><p>Tu cuenta de SIGRA fue bloqueada por exceder el número máximo de intentos fallidos de inicio de sesión.</p><p>Podrás intentar de nuevo después de: <strong>{horaDesbloqueo}</strong>.</p><p>Si no fuiste tú, contacta a Administración.</p>";
            await _email.EnviarAsync(correo, nombre, "Tu cuenta de SIGRA ha sido bloqueada", cuerpo);
        }
        catch
        {
        }
    }
}
