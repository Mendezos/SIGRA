using SIGRA.Abstracciones.Servicios;

namespace SIGRA.API.Servicios;

public class CorreosPendientesWorker(IServiceScopeFactory scopes, ILogger<CorreosPendientesWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var servicio = scope.ServiceProvider.GetRequiredService<ICorreosPendientesService>();
                for (var i = 0; i < 20 && !stoppingToken.IsCancellationRequested; i++)
                    if (!await servicio.EnviarAhoraAsync()) break;
            }
            catch (Exception ex) { logger.LogError(ex, "No se pudo procesar la cola de correos."); }
            try { await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }
}
