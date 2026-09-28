using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.API.Extensions;

namespace SIGRA.API.Filters;

[AttributeUsage(AttributeTargets.Method)]
public class PermisoCuentasAttribute(string accion)
    : Attribute, IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var servicios = context.HttpContext.RequestServices;
        var usuarios = servicios.GetRequiredService<IUsuarioDA>();
        var cuentas = servicios.GetRequiredService<IGestionCuentasDA>();
        var permisos = servicios.GetRequiredService<IRolPermisoDA>();

        var usuario = await usuarios.ObtenerPorIdAsync(
            context.HttpContext.User.ObtenerIdUsuario());

        if (usuario is null || !usuario.Activo
            || usuario.NombreRol != "Administrador del sistema")
        {
            context.Result = new ForbidResult();
            return;
        }

        var roles = await cuentas.RolesAsync();

        if (!roles.Any(r => r.IdRol == usuario.IdRol))
        {
            context.Result = new ForbidResult();
            return;
        }

        var permiso = (await permisos.ObtenerPorRolAsync(usuario.IdRol))
            .FirstOrDefault(p => p.IdModulo == 1);

        var permitido = permiso is not null && (accion switch
        {
            "Lectura" => permiso.Lectura,
            "Escritura" => permiso.Escritura,
            "Edicion" => permiso.Edicion,
            "Eliminacion" => permiso.Eliminacion,
            _ => false
        });

        if (!permitido)
            context.Result = new ForbidResult();
    }
}