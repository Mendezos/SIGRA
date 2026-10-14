using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.API.Extensions;

namespace SIGRA.API.Filters;

/// <summary>
/// Aplica los permisos que el administrador define en "Roles y permisos" (tabla RolPermiso) a un controlador o endpoint.
/// La acción se deduce del verbo HTTP: GET = Lectura, POST = Escritura, PUT/PATCH = Edición, DELETE = Eliminación.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class PermisoModuloAttribute(int idModulo) : Attribute, IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var http = context.HttpContext;
        if (http.User.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var usuarios = http.RequestServices.GetRequiredService<IUsuarioDA>();
        var permisos = http.RequestServices.GetRequiredService<IRolPermisoDA>();

        var usuario = await usuarios.ObtenerPorIdAsync(http.User.ObtenerIdUsuario());
        if (usuario is null || !usuario.Activo)
        {
            context.Result = new ForbidResult();
            return;
        }

        var permiso = (await permisos.ObtenerPorRolAsync(usuario.IdRol)).FirstOrDefault(p => p.IdModulo == idModulo);
        var permitido = permiso is not null && http.Request.Method.ToUpperInvariant() switch
        {
            "GET" or "HEAD" or "OPTIONS" => permiso.Lectura,
            "POST" => permiso.Escritura,
            "PUT" or "PATCH" => permiso.Edicion,
            "DELETE" => permiso.Eliminacion,
            _ => false
        };

        if (!permitido)
            context.Result = new ObjectResult(new { mensaje = "Su rol no tiene permiso para esta acción en este módulo." }) { StatusCode = StatusCodes.Status403Forbidden };
    }
}

/// <summary>
/// Restringe un endpoint a ciertos roles (lista separada por comas). Compara ignorando mayúsculas y tildes,
/// para que "Técnico" y "Tecnico" se traten igual en cualquier base de datos.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public class RolesPermitidosAttribute(string roles) : Attribute, IAuthorizationFilter
{
    private readonly HashSet<string> _roles = roles
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Select(NormalizadorRoles.Normalizar)
        .ToHashSet();

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;
        if (user.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        if (!user.TieneAlgunRol(_roles))
        {
            context.Result = new ObjectResult(new { mensaje = "Su rol no tiene acceso a esta función." }) { StatusCode = StatusCodes.Status403Forbidden };
        }
    }
}

public static class NormalizadorRoles
{
    public static string Normalizar(string texto)
    {
        var descompuesto = texto.Trim().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(descompuesto.Length);
        foreach (var c in descompuesto)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) sb.Append(c);
        }

        return sb.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
    }
}
