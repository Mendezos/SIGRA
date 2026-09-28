using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using System.IdentityModel.Tokens.Jwt;

namespace SIGRA.API.Middlewares;

public class SesionActivaMiddleware
{
    private readonly RequestDelegate _next;

    public SesionActivaMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ISesionDA sesionDA, IPoliticaSeguridadDA politicaDA)
    {
        if (context.User?.Identity?.IsAuthenticated == true)
        {
            var jti = context.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value
                ?? context.User.FindFirst("jti")?.Value;

            if (string.IsNullOrEmpty(jti))
            {
                await EscribirNoAutorizado(context, "Token inválido.");
                return;
            }

            var sesion = await sesionDA.ObtenerActivaAsync(jti);
            if (sesion is null)
            {
                await EscribirNoAutorizado(context, "Su sesión ha expirado o fue cerrada. Inicie sesión nuevamente.");
                return;
            }

            var politica = await politicaDA.ObtenerActivaAsync();
            var minutosInactividad = politica?.MinutosInactividad ?? 30;

            if (sesion.UltimaActividad.AddMinutes(minutosInactividad) < DateTime.UtcNow)
            {
                await sesionDA.CerrarAsync(jti);
                await EscribirNoAutorizado(context, "Su sesión ha expirado por inactividad. Inicie sesión nuevamente.");
                return;
            }

            await sesionDA.ActualizarActividadAsync(jti);
        }

        await _next(context);
    }

    private static async Task EscribirNoAutorizado(HttpContext context, string mensaje)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new { mensaje });
    }
}
