using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Modelos;
using SIGRA.Abstracciones.Servicios;
using SIGRA.Flujo.Utilidades;
using System.Net.Mail;

namespace SIGRA.Flujo.Flujos;

public class UsuarioFlujo : IUsuarioFlujo
{
    private const string RolAdministrador = "Administrador del sistema";

    private readonly IUsuarioDA _usuarioDA;
    private readonly IRolDA _rolDA;
    private readonly IPoliticaSeguridadDA _politicaDA;
    private readonly ISesionDA _sesionDA;
    private readonly IAuditoriaDA _auditoriaDA;
    private readonly IPasswordHasher _hasher;

    public UsuarioFlujo(
        IUsuarioDA usuarioDA, IRolDA rolDA, IPoliticaSeguridadDA politicaDA, ISesionDA sesionDA,
        IAuditoriaDA auditoriaDA, IPasswordHasher hasher)
    {
        _usuarioDA = usuarioDA;
        _rolDA = rolDA;
        _politicaDA = politicaDA;
        _sesionDA = sesionDA;
        _auditoriaDA = auditoriaDA;
        _hasher = hasher;
    }

    public async Task<List<UsuarioDto>> ListarAsync()
    {
        var usuarios = await _usuarioDA.ListarAsync();
        return usuarios.Select(ADto).ToList();
    }

    public async Task<List<RolDto>> ListarRolesAsignablesAsync(bool esAdministrador)
    {
        var roles = await _rolDA.ListarAsync();
        return roles
            .Where(r => r.Activo && (esAdministrador || r.Nombre != RolAdministrador))
            .Select(r => new RolDto { IdRol = r.IdRol, Nombre = r.Nombre, Descripcion = r.Descripcion, Activo = r.Activo })
            .ToList();
    }

    public async Task<UsuarioDto> CrearAsync(CrearUsuarioDto dto, int idUsuarioCreador, bool esAdministrador)
    {
        var errores = new List<string>();
        var nombre = (dto.Nombre ?? string.Empty).Trim();
        var correo = (dto.Correo ?? string.Empty).Trim();
        var telefono = string.IsNullOrWhiteSpace(dto.Telefono) ? null : dto.Telefono.Trim();

        if (string.IsNullOrWhiteSpace(nombre))
            errores.Add("El nombre es obligatorio.");
        else if (nombre.Length > 150)
            errores.Add("El nombre no puede superar los 150 caracteres.");

        if (string.IsNullOrWhiteSpace(correo))
            errores.Add("El correo es obligatorio.");
        else if (correo.Length > 150)
            errores.Add("El correo no puede superar los 150 caracteres.");
        else if (!MailAddress.TryCreate(correo, out var direccion) || direccion.Address != correo)
            errores.Add("El correo no tiene un formato válido.");

        if (telefono is not null && telefono.Length > 20)
            errores.Add("El teléfono no puede superar los 20 caracteres.");

        if (dto.IdRol is null)
            errores.Add("El rol es obligatorio.");

        if (errores.Count > 0)
            throw new ValidacionException("Uno o más valores están fuera del rango permitido.", errores);

        var rol = await _rolDA.ObtenerPorIdAsync(dto.IdRol!.Value)
            ?? throw new ReglaNegocioException("El rol indicado no existe.");

        if (!rol.Activo)
            throw new ReglaNegocioException("El rol indicado está inactivo.");

        if (!esAdministrador && rol.Nombre == RolAdministrador)
            throw new ReglaNegocioException("Solo el Administrador del sistema puede crear otros administradores.");

        if (await _usuarioDA.ObtenerPorCorreoAsync(correo) is not null)
            throw new ReglaNegocioException($"Ya existe un usuario con el correo \"{correo}\".");

        var hash = await ValidarYHashearAsync(dto.Password);

        var nuevo = await _usuarioDA.CrearAsync(rol.IdRol, nombre, correo, telefono, hash);
        await _auditoriaDA.RegistrarAsync(idUsuarioCreador, "Seguridad", "Usuario", nuevo.IdUsuario, "USUARIO_CREADO", $"{correo} - rol \"{rol.Nombre}\"");

        return ADto(nuevo);
    }

    public async Task CambiarPasswordAsync(int idUsuario, string passwordNueva, int idUsuarioAdministrador)
    {
        if (idUsuario == idUsuarioAdministrador)
            throw new ReglaNegocioException("Para cambiar su propia contraseña use la opción \"Mi perfil\".");

        _ = await _usuarioDA.ObtenerPorIdAsync(idUsuario)
            ?? throw new ReglaNegocioException("El usuario indicado no existe.");

        var hash = await ValidarYHashearAsync(passwordNueva);

        await _usuarioDA.ActualizarPasswordHashAsync(idUsuario, hash);
        await _sesionDA.CerrarTodasDelUsuarioAsync(idUsuario);
        await _auditoriaDA.RegistrarAsync(idUsuarioAdministrador, "Seguridad", "Usuario", idUsuario, "PASSWORD_CAMBIADA_POR_ADMIN");
    }

    private async Task<string> ValidarYHashearAsync(string password)
    {
        var politica = await _politicaDA.ObtenerActivaAsync()
            ?? throw new ReglaNegocioException("No hay una política de seguridad configurada. Contacte a Administración.");

        var errores = PoliticaPasswordValidador.Validar(password, politica.LongitudMinimaPassword);
        if (errores.Count > 0)
            throw new ValidacionException("La contraseña no cumple la política de seguridad.", errores);

        return _hasher.Hash(password);
    }

    private static UsuarioDto ADto(UsuarioModel usuario) => new()
    {
        IdUsuario = usuario.IdUsuario,
        Nombre = usuario.Nombre,
        Correo = usuario.Correo,
        Telefono = usuario.Telefono,
        IdRol = usuario.IdRol,
        Rol = usuario.NombreRol,
        Activo = usuario.Activo,
        Bloqueada = usuario.BloqueadoHasta.HasValue && usuario.BloqueadoHasta.Value > DateTime.UtcNow
    };
}
