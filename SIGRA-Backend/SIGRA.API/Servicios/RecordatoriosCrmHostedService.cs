using SIGRA.Abstracciones.Flujo;

namespace SIGRA.API.Servicios;

// T-02: servicio de recordatorios del CRM. Cada pocos minutos ejecuta una vuelta de ICrmRecordatoriosFlujo.ProcesarAsync(): marca los
// seguimientos atrasados, extiende las series de contactos periódicos, avisa de los seguimientos que llegaron a su hora y de las baterías
// que cumplieron los 11 meses (campana + correo encolado). Es idempotente, así que repetir la vuelta (o reiniciar la API) no duplica avisos.
// El intervalo sale de la configuración Crm:IntervaloMinutosRecordatorios (por omisión 5 minutos, mínimo 1).
public class RecordatoriosCrmHostedService : BackgroundService
{
    private static readonly TimeSpan EsperaInicial = TimeSpan.FromSeconds(20);
    public const int MinutosPorOmision = 5;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RecordatoriosCrmHostedService> _logger;
    private readonly TimeSpan _intervalo;

    public RecordatoriosCrmHostedService(IServiceScopeFactory scopeFactory, IConfiguration configuracion,
        ILogger<RecordatoriosCrmHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _intervalo = CalcularIntervalo(configuracion.GetValue<int?>("Crm:IntervaloMinutosRecordatorios"));
    }

    public static TimeSpan CalcularIntervalo(int? minutos) => TimeSpan.FromMinutes(Math.Max(1, minutos ?? MinutosPorOmision));

    public TimeSpan Intervalo => _intervalo;

    protected override async Task ExecuteAsync(CancellationToken detener)
    {
        try
        {
            await Task.Delay(EsperaInicial, detener);

            while (!detener.IsCancellationRequested)
            {
                await EjecutarVueltaAsync();
                await Task.Delay(_intervalo, detener);
            }
        }
        catch (OperationCanceledException)
        {
            // La API se está deteniendo.
        }
    }

    // Una vuelta completa; cualquier error se registra y no detiene el servicio (la siguiente vuelta reintenta lo pendiente).
    public async Task EjecutarVueltaAsync()
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var flujo = scope.ServiceProvider.GetRequiredService<ICrmRecordatoriosFlujo>();
            var resumen = await flujo.ProcesarAsync();

            if (resumen.HuboCambios)
                _logger.LogInformation("Recordatorios del CRM: {Mensaje}", resumen.Mensaje);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "Falló la revisión automática de recordatorios del CRM.");
        }
    }
}
