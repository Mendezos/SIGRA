using NSubstitute;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Flujo.Flujos;

namespace SIGRA.Pruebas;

// DAR-004 y 008: filtros del panel de inventario.
public class DashboardFlujoPruebas
{
    private readonly IDashboardDA _da = Substitute.For<IDashboardDA>();

    [Fact]
    public async Task Un_rango_de_fechas_invertido_no_consulta_y_pide_corregirlo()
    {
        var flujo = new DashboardFlujo(_da);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            flujo.ObtenerInventarioAsync(null, null, new DateTime(2026, 11, 20), new DateTime(2026, 11, 1)));

        Assert.Contains("fecha inicial", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().ObtenerInventarioAsync(default, default, default, default);
    }

    [Fact]
    public async Task Los_filtros_de_categoria_modelo_y_fechas_llegan_a_la_consulta()
    {
        _da.ObtenerInventarioAsync(default, default, default, default).ReturnsForAnyArgs(new DashboardInventarioDto());
        var flujo = new DashboardFlujo(_da);

        await flujo.ObtenerInventarioAsync(1, 4, new DateTime(2026, 1, 1, 15, 0, 0), new DateTime(2026, 6, 30));

        await _da.Received(1).ObtenerInventarioAsync(1, 4, new DateTime(2026, 1, 1), new DateTime(2026, 6, 30));
    }

    // DAR-020 y 022: rango de fechas del panel de taller.
    [Fact]
    public async Task Taller_con_rango_invertido_avisa_que_no_es_valido_y_no_consulta()
    {
        var flujo = new DashboardFlujo(_da);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            flujo.ObtenerTallerAsync(null, null, new DateTime(2026, 11, 20), new DateTime(2026, 11, 1)));

        Assert.Equal("El rango de fechas ingresado no es válido.", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().ObtenerTallerAsync(default, default, default, default);
    }

    [Fact]
    public async Task Taller_ignora_un_tipo_de_servicio_en_blanco()
    {
        _da.ObtenerTallerAsync(default, default, default, default).ReturnsForAnyArgs(new DashboardTallerDto());
        var flujo = new DashboardFlujo(_da);

        await flujo.ObtenerTallerAsync(4, "   ", null, null);

        await _da.Received(1).ObtenerTallerAsync(4, null, null, null);
    }
}
