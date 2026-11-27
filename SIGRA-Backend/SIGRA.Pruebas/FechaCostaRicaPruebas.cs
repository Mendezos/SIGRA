using SIGRA.Abstracciones.Utilidades;

namespace SIGRA.Pruebas;

// Azure trabaja en UTC: «hoy» debe ser la fecha de Costa Rica (UTC-6) aunque el servidor ya esté en el día siguiente.
public class FechaCostaRicaPruebas
{
    [Fact]
    public void Ahora_va_seis_horas_detras_de_UTC()
    {
        var diferencia = DateTime.UtcNow - FechaCostaRica.Ahora;

        Assert.InRange(diferencia.TotalHours, 5.99, 6.01);
    }

    [Fact]
    public void Hoy_es_la_fecha_de_Costa_Rica_y_coincide_con_HoyFecha()
    {
        Assert.Equal(FechaCostaRica.Ahora.Date, FechaCostaRica.Hoy);
        Assert.Equal(DateOnly.FromDateTime(FechaCostaRica.Hoy), FechaCostaRica.HoyFecha);
    }
}
