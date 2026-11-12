using NSubstitute;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Flujo.Flujos;

namespace SIGRA.Pruebas;

public class FacturaFlujoPruebas
{
    private readonly IFacturaDA _da = Substitute.For<IFacturaDA>();
    private readonly FacturaFlujo _flujo;

    public FacturaFlujoPruebas() => _flujo = new FacturaFlujo(_da);

    [Fact]
    public async Task RegistrarAsync_FacturaValida_CalculaImpuestoYTotal()
    {
        _da.RegistrarAsync(Arg.Any<FacturaDto>())
            .Returns(call => call.Arg<FacturaDto>());

        var resultado = await _flujo.RegistrarAsync(new RegistrarFacturaDto
        {
            Cliente = "Cliente demo",
            Tipo = "Servicio",
            Lineas = [new LineaFacturaDto { Descripcion = "Mantenimiento", Cantidad = 2, PrecioUnitario = 1000 }]
        }, 1);

        Assert.Equal(2000, resultado.Subtotal);
        Assert.Equal(260, resultado.Impuesto);
        Assert.Equal(2260, resultado.Total);
        Assert.Equal("Pendiente", resultado.EstadoCobro);
    }

    [Fact]
    public async Task RegistrarAsync_FechaFutura_LanzaValidacion()
    {
        var excepcion = await Assert.ThrowsAsync<ValidacionException>(() =>
            _flujo.RegistrarAsync(new RegistrarFacturaDto
            {
                Cliente = "Cliente demo",
                Tipo = "Venta",
                FechaEmision = DateOnly.FromDateTime(DateTime.Today.AddDays(1)),
                Lineas = [new LineaFacturaDto { Descripcion = "Equipo", Cantidad = 1, PrecioUnitario = 100 }]
            }, 1));

        Assert.Contains("no puede ser futura", excepcion.Errores[0]);
    }

    [Fact]
    public async Task RegistrarAsync_FechaActualDeCostaRica_EsValida()
    {
        _da.RegistrarAsync(Arg.Any<FacturaDto>())
            .Returns(call => call.Arg<FacturaDto>());

        var resultado = await _flujo.RegistrarAsync(new RegistrarFacturaDto
        {
            Cliente = "Cliente demo",
            Tipo = "Venta",
            FechaEmision = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-6)),
            Lineas = [new LineaFacturaDto { Descripcion = "Equipo", Cantidad = 1, PrecioUnitario = 100 }]
        }, 1);

        Assert.Equal(DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-6)), resultado.FechaEmision);
    }

    [Fact]
    public async Task CambiarEstadoCobro_EstadoValido_ActualizaFactura()
    {
        _da.ListarAsync().Returns([new FacturaDto { IdFactura = 7, EstadoCobro = "Pendiente" }]);
        _da.CambiarEstadoCobroAsync(7, "Pagada")
            .Returns(new FacturaDto { IdFactura = 7, EstadoCobro = "Pagada" });

        var resultado = await _flujo.CambiarEstadoCobroAsync(
            7, new CambiarEstadoCobroDto
            {
                EstadoCobro = "Pagada",
                FechaPago = DateOnly.FromDateTime(DateTime.Today),
                MetodoPago = "Transferencia",
                ReferenciaPago = "TRX-001"
            }, 1);

        Assert.Equal("Pagada", resultado.EstadoCobro);
        await _da.Received(1).CambiarEstadoCobroAsync(7, "Pagada");
    }

    [Fact]
    public async Task CambiarEstadoCobro_IrregularSinDatos_LanzaValidacion()
    {
        _da.ListarAsync().Returns([new FacturaDto { IdFactura = 7, EstadoCobro = "Pendiente" }]);

        await Assert.ThrowsAsync<ValidacionException>(() =>
            _flujo.CambiarEstadoCobroAsync(
                7, new CambiarEstadoCobroDto { EstadoCobro = "Irregular" }, 1));

        await _da.DidNotReceive().CambiarEstadoCobroAsync(Arg.Any<int>(), Arg.Any<string>());
    }
}
