using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Modelos;

namespace SIGRA.Flujo.Flujos;

public class RolFlujo : IRolFlujo
{
    private readonly IRolDA _rolDA;
    private readonly IAuditoriaDA _auditoriaDA;

    public RolFlujo(IRolDA rolDA, IAuditoriaDA auditoriaDA)
    {
        _rolDA = rolDA;
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
