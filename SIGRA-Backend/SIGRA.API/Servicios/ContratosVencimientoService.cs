using SIGRA.Abstracciones.Flujo;

namespace SIGRA.API.Servicios;

/// <summary>
/// Revisa los contratos de alquiler al arrancar y luego cada 6 horas: marca los vencidos y envía
/// las alertas por correo de 90 días, 30 días y 3 años (CARR-005).
/// </summary>
public class ContratosVencimientoService : BackgroundService
{
    private static readonly TimeSpan Intervalo = TimeSpan.FromHours(6);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ContratosVencimientoService> _logger;

    public ContratosVencimientoService(IServiceScopeFactory scopeFactory, ILogger<ContratosVencimientoService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                await EjecutarAsync();
                await Task.Delay(Intervalo, stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            // La aplicación se está deteniendo.
        }
    }

    private async Task EjecutarAsync()
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var flujo = scope.ServiceProvider.GetRequiredService<IAlquilerFlujo>();
            var resultado = await flujo.ProcesarVencimientosAsync();

            _logger.LogInformation("Vencimientos de contratos: {Vencidos} marcado(s) como vencido(s), {Alertas} alerta(s) generada(s).",
                resultado.ContratosVencidos, resultado.AlertasGeneradas);

            foreach (var error in resultado.Errores)
                _logger.LogWarning("No se pudo enviar una alerta de contrato: {Error}", error);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Falló la revisión de vencimientos de contratos.");
        }
    }
}
