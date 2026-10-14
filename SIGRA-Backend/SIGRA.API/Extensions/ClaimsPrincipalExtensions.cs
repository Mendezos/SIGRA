using SIGRA.Abstracciones.Excepciones;
using SIGRA.API.Filters;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace SIGRA.API.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static int ObtenerIdUsuario(this ClaimsPrincipal usuario)
    {
        var valor = usuario.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? usuario.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (!int.TryParse(valor, out var id))
            throw new SesionInvalidaException("Token inválido.");

        return id;
    }

    public static string ObtenerTokenId(this ClaimsPrincipal usuario)
    {
        return usuario.FindFirst(JwtRegisteredClaimNames.Jti)?.Value
            ?? usuario.FindFirst("jti")?.Value
            ?? throw new SesionInvalidaException("Token inválido.");
    }

    // Roles del token, sin mayúsculas ni tildes (para que Técnico y Tecnico se traten igual).
    public static bool TieneAlgunRol(this ClaimsPrincipal usuario, IEnumerable<string> rolesNormalizados)
    {
        var buscados = rolesNormalizados as ISet<string> ?? rolesNormalizados.ToHashSet();
        return usuario.Claims
            .Where(c => c.Type == ClaimTypes.Role || c.Type == "role")
            .Any(c => buscados.Contains(NormalizadorRoles.Normalizar(c.Value)));
    }

    public static bool TieneRol(this ClaimsPrincipal usuario, string rol) =>
        usuario.TieneAlgunRol(new[] { NormalizadorRoles.Normalizar(rol) });
}
