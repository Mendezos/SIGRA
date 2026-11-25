namespace SIGRA.Abstracciones.Utilidades;

// Fecha y hora de Costa Rica (UTC-6, sin horario de verano), sin importar la zona horaria del servidor.
// Azure trabaja en UTC: después de las 6 p. m. en Costa Rica ya es "mañana" para DateTime.Today, y eso hacía rechazar
// fechas de hoy (por ejemplo, un contrato que inicia hoy aparecía como "ya pasó"). Todo lo que compare contra "hoy" debe usar esto.
public static class FechaCostaRica
{
    private static readonly TimeSpan Desfase = TimeSpan.FromHours(-6);

    public static DateTime Ahora => DateTime.UtcNow.Add(Desfase);

    public static DateTime Hoy => Ahora.Date;

    public static DateOnly HoyFecha => DateOnly.FromDateTime(Ahora);
}
