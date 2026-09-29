using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Modelos;

namespace SIGRA.Flujo.Flujos;

public class RolFlujo : IRolFlujo
{
    private const int TotalModulos = 11;

    private readonly IRolDA _rolDA;
    private readonly IRolPermisoDA _rolPermisoDA;
    private readonly IAuditoriaDA _auditoriaDA;

    public RolFlujo(IRolDA rolDA, IRolPermisoDA rolPermisoDA, IAuditoriaDA auditoriaDA)
    {
        _rolDA = rolDA;
        _rolPermisoDA = rolPermisoDA;
        _auditoriaDA = auditoriaDA;
    }

    public async Task<RolModel> CrearAsync(string nombre, int idUsuarioAdministrador)
    {
        var nombreNormalizado = ValidarNombre(nombre);

        if (await _rolDA.ExisteConNombreAsync(nombreNormalizado))
            throw new ReglaNegocioException($"Ya existe un rol con el nombre \"{nombreNormalizado}\".");

        var nuevo = await _rolDA.CrearAsync(nombreNormalizado);

        await _auditoriaDA.RegistrarAsync(idUsuarioAdministrador, "Seguridad", "Rol", nuevo.IdRol, "ROL_CREADO", nombreNormalizado);

        return nuevo;
    }

    public async Task<List<RolModel>> ListarAsync()
    {
        return await _rolDA.ListarAsync();
    }

    public async Task<RolModel> EditarAsync(int idRol, string nombre, int idUsuarioAdministrador)
    {
        var existente = await _rolDA.ObtenerPorIdAsync(idRol)
            ?? throw new ReglaNegocioException("El rol indicado no existe.");

        var nombreNormalizado = ValidarNombre(nombre);

        if (await _rolDA.ExisteConNombreExcluyendoAsync(nombreNormalizado, idRol))
            throw new ReglaNegocioException($"Ya existe un rol con el nombre \"{nombreNormalizado}\".");

        var nombreAnterior = existente.Nombre;
        var actualizado = await _rolDA.EditarAsync(idRol, nombreNormalizado);

        await _auditoriaDA.RegistrarAsync(idUsuarioAdministrador, "Seguridad", "Rol", idRol, "ROL_EDITADO", $"De \"{nombreAnterior}\" a \"{nombreNormalizado}\"");

        return actualizado;
    }

    public async Task<RolModel> CambiarEstadoAsync(int idRol, bool activo, int idUsuarioAdministrador)
    {
        var existente = await _rolDA.ObtenerPorIdAsync(idRol)
            ?? throw new ReglaNegocioException("El rol indicado no existe.");

        var actualizado = await _rolDA.CambiarEstadoAsync(idRol, activo);

        var accion = activo ? "ROL_ACTIVADO" : "ROL_DESACTIVADO";
        await _auditoriaDA.RegistrarAsync(idUsuarioAdministrador, "Seguridad", "Rol", idRol, accion, existente.Nombre);

        return actualizado;
    }

    public async Task<List<PermisoModuloDto>> DefinirPermisosAsync(int idRol, List<PermisoModuloDto> permisos, int idUsuarioAdministrador)
    {
        var existente = await _rolDA.ObtenerPorIdAsync(idRol)
            ?? throw new ReglaNegocioException("El rol indicado no existe.");

        if (permisos is null || permisos.Count == 0)
            throw new ValidacionException("Uno o más valores están fuera del rango permitido.", new List<string> { "Debe indicar al menos un módulo con sus permisos." });

        var errores = new List<string>();
        foreach (var permiso in permisos)
        {
            if (permiso.IdModulo < 1 || permiso.IdModulo > TotalModulos)
                errores.Add($"El módulo {permiso.IdModulo} no es válido.");
        }

        if (errores.Count > 0)
            throw new ValidacionException("Uno o más valores están fuera del rango permitido.", errores);

        foreach (var permiso in permisos)
        {
            await _rolPermisoDA.DefinirAsync(idRol, permiso.IdModulo, permiso.Lectura, permiso.Escritura, permiso.Edicion, permiso.Eliminacion);
        }

        var modulosAfectados = string.Join(", ", permisos.Select(p => p.IdModulo));
        await _auditoriaDA.RegistrarAsync(idUsuarioAdministrador, "Seguridad", "Rol", idRol, "PERMISOS_DEFINIDOS", $"Rol \"{existente.Nombre}\" - módulos: {modulosAfectados}");

        return await _rolPermisoDA.ObtenerPorRolAsync(idRol);
    }

    public async Task<List<PermisoModuloDto>> ObtenerPermisosAsync(int idRol)
    {
        _ = await _rolDA.ObtenerPorIdAsync(idRol)
            ?? throw new ReglaNegocioException("El rol indicado no existe.");

        return await _rolPermisoDA.ObtenerPorRolAsync(idRol);
    }

    private static string ValidarNombre(string nombre)
    {
        var errores = new List<string>();

        if (string.IsNullOrWhiteSpace(nombre))
            errores.Add("El nombre del rol es obligatorio.");
        else if (nombre.Trim().Length > 100)
            errores.Add("El nombre del rol no puede superar los 100 caracteres.");

        if (errores.Count > 0)
            throw new ValidacionException("Uno o más valores están fuera del rango permitido.", errores);

        return nombre.Trim();
    }
}
