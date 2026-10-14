using SIGRA.Abstracciones.Flujo;

namespace SIGRA.API.Servicios;

// Proceso automático de RCFR-003: revisa periódicamente los vencimientos de las frecuencias, genera las alertas
// (6 meses, 3 meses y 30 días), envía los correos y marca como "Vencida" lo que llegó a su fecha de vencimiento.
// Es idempotente, por lo que repetir la revisión (o reiniciar la API) no duplica alertas ni correos.
public class AlertasFrecuenciaHostedService : BackgroundService
{
    private static readonly TimeSpan EsperaInicial = TimeSpan.FromSeconds(20);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AlertasFrecuenciaHostedService> _logger;
    private readonly TimeSpan _intervalo;

    public AlertasFrecuenciaHostedService(IServiceScopeFactory scopeFactory, IConfiguration configuracion,
        ILogger<AlertasFrecuenciaHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        var minutos = configuracion.GetValue<int?>("Frecuencias:IntervaloMinutosAlertas") ?? 60;
        _intervalo = TimeSpan.FromMinutes(Math.Max(1, minutos));
    }

    protected override async Task ExecuteAsync(CancellationToken detener)
    {
        try
        {
            await Task.Delay(EsperaInicial, detener);

            while (!detener.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var flujo = scope.ServiceProvider.GetRequiredService<IFrecuenciaFlujo>();
                    var resultado = await flujo.ProcesarAlertasAsync();

                    if (resultado.AlertasGeneradas > 0 || resultado.FrecuenciasVencidas > 0 || resultado.CorreosEnviados > 0 || resultado.CorreosFallidos > 0)
                        _logger.LogInformation("Alertas de frecuencias: {Mensaje}", resultado.Mensaje);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogError(ex, "Falló la verificación automática de vencimientos de frecuencias.");
                }

                await Task.Delay(_intervalo, detener);
            }
        }
        catch (OperationCanceledException)
        {
            // La API se está deteniendo.
        }
    }
}
