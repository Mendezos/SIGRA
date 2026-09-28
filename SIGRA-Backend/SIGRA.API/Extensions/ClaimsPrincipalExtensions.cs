using SIGRA.Abstracciones.Excepciones;
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
}
