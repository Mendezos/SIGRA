using SIGRA.Abstracciones.Excepciones;

namespace SIGRA.API.Middlewares;

public class ManejadorGlobalExcepcionesMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ManejadorGlobalExcepcionesMiddleware> _logger;

    public ManejadorGlobalExcepcionesMiddleware(RequestDelegate next, ILogger<ManejadorGlobalExcepcionesMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidacionException ex)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new { mensaje = ex.Message, errores = ex.Errores });
        }
        catch (CuentaBloqueadaException ex)
        {
            context.Response.StatusCode = StatusCodes.Status423Locked;
            await context.Response.WriteAsJsonAsync(new { mensaje = ex.Message, minutosRestantes = ex.MinutosRestantes });
        }
        catch (SesionInvalidaException ex)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { mensaje = ex.Message });
        }
        catch (ReglaNegocioException ex)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new { mensaje = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error no controlado en la API.");
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(new { mensaje = "Ocurrió un error inesperado. Intente nuevamente más tarde." });
        }
    }
}
