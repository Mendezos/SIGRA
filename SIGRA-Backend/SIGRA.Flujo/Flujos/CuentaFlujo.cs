using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Servicios;

namespace SIGRA.Flujo.Flujos;

public class CuentaFlujo : ICuentaFlujo
{
    private readonly IUsuarioDA _usuarioDA;
    private readonly IAuditoriaDA _auditoriaDA;
    private readonly IEmailService _email;

    public CuentaFlujo(IUsuarioDA usuarioDA, IAuditoriaDA auditoriaDA, IEmailService email)
    {
        _usuarioDA = usuarioDA;
        _auditoriaDA = auditoriaDA;
        _email = email;
    }

    public async Task<EstadoCuentaDto> ObtenerEstadoAsync(int idUsuario)
    {
        var usuario = await _usuarioDA.ObtenerPorIdAsync(idUsuario)
            ?? throw new ReglaNegocioException("El usuario indicado no existe.");

        var intentos = await _auditoriaDA.ObtenerRecientesPorUsuarioAsync(idUsuario, 20);

        return new EstadoCuentaDto
        {
            IdUsuario = usuario.IdUsuario,
            Nombre = usuario.Nombre,
            Correo = usuario.Correo,
            Activo = usuario.Activo,
            Bloqueada = usuario.BloqueadoHasta.HasValue && usuario.BloqueadoHasta.Value > DateTime.UtcNow,
            IntentosFallidos = usuario.IntentosFallidos,
            BloqueadoHasta = usuario.BloqueadoHasta,
            FechaBloqueo = usuario.FechaBloqueo,
            IntentosRecientes = intentos.Select(i => new IntentoAuditoriaDto
            {
                Fecha = i.Fecha,
                Accion = i.Accion,
                Detalle = i.Detalle
            }).ToList()
        };
    }

    public async Task<List<EstadoCuentaDto>> ObtenerCuentasBloqueadasAsync()
    {
        var usuarios = await _usuarioDA.ObtenerBloqueadosAsync();
        var resultado = new List<EstadoCuentaDto>();

        foreach (var usuario in usuarios)
        {
            var intentos = await _auditoriaDA.ObtenerRecientesPorUsuarioAsync(usuario.IdUsuario, 5);

            resultado.Add(new EstadoCuentaDto
            {
                IdUsuario = usuario.IdUsuario,
                Nombre = usuario.Nombre,
                Correo = usuario.Correo,
                Activo = usuario.Activo,
                Bloqueada = true,
                IntentosFallidos = usuario.IntentosFallidos,
                BloqueadoHasta = usuario.BloqueadoHasta,
                FechaBloqueo = usuario.FechaBloqueo,
                IntentosRecientes = intentos.Select(i => new IntentoAuditoriaDto
                {
                    Fecha = i.Fecha,
                    Accion = i.Accion,
                    Detalle = i.Detalle
                }).ToList()
            });
        }

        return resultado;
    }

    public async Task DesbloquearCuentaAsync(int idUsuario, int idUsuarioAdministrador, string motivo)
    {
        if (string.IsNullOrWhiteSpace(motivo))
            throw new ValidacionException("Debe indicar el motivo del desbloqueo.", new List<string> { "El motivo es obligatorio." });

        var usuario = await _usuarioDA.ObtenerPorIdAsync(idUsuario)
            ?? throw new ReglaNegocioException("El usuario indicado no existe.");

        var estaBloqueada = usuario.BloqueadoHasta.HasValue && usuario.BloqueadoHasta.Value > DateTime.UtcNow;

        if (!estaBloqueada)
            throw new ReglaNegocioException("Esa cuenta no está bloqueada.");

        if (!usuario.Activo)
            throw new ReglaNegocioException("La cuenta está inactiva. Debe reactivarla antes de poder desbloquearla.");

        await _usuarioDA.DesbloquearCuentaAsync(idUsuario);
        await _auditoriaDA.RegistrarAsync(idUsuarioAdministrador, "Seguridad", "Usuario", idUsuario, "CUENTA_DESBLOQUEADA", motivo);

        try
        {
            var cuerpo = $"<p>Hola {usuario.Nombre},</p><p>Tu cuenta de SIGRA fue desbloqueada por un administrador. Ya puedes iniciar sesión normalmente.</p>";
            await _email.EnviarAsync(usuario.Correo, usuario.Nombre, "Tu cuenta de SIGRA fue desbloqueada", cuerpo);
        }
        catch
        {
            await _auditoriaDA.RegistrarAsync(idUsuario, "Seguridad", "Usuario", idUsuario, "NOTIFICACION_DESBLOQUEO_FALLIDA");
        }
    }
}
