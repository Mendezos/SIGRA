using NSubstitute;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Flujo.Flujos;

namespace SIGRA.Pruebas;

public class NotaCreditoFlujoPruebas
{
    private readonly INotaCreditoDA _da = Substitute.For<INotaCreditoDA>();
    private readonly IFacturaDA _facturaDa = Substitute.For<IFacturaDA>();
    private readonly NotaCreditoFlujo _flujo;

    public NotaCreditoFlujoPruebas() => _flujo = new NotaCreditoFlujo(_da, _facturaDa);

    [Fact]
    public async Task RegistrarAsync_FacturaValida_CreaNotaPendiente()
    {
        _facturaDa.ListarAsync().Returns([new FacturaDto
        {
            IdFactura = 4,
            Numero = "FA-DEMO-0004",
            Cliente = "Cliente demo",
            Total = 1000,
            EstadoCobro = "Pendiente"
        }]);
        _da.RegistrarAsync(Arg.Any<NotaCreditoDto>())
            .Returns(call => call.Arg<NotaCreditoDto>());

        var resultado = await _flujo.RegistrarAsync(new RegistrarNotaCreditoDto
        {
            IdFactura = 4,
            Motivo = "Ajuste comercial",
            Monto = 250
        }, 1);

        Assert.Equal("FA-DEMO-0004", resultado.Factura);
        Assert.Equal("Pendiente", resultado.Estado);
        Assert.Equal(250, resultado.Monto);
    }

    [Fact]
    public async Task RegistrarAsync_MontoMayorQueFactura_LanzaValidacion()
    {
        _facturaDa.ListarAsync().Returns([new FacturaDto
        {
            IdFactura = 4,
            Total = 1000,
            EstadoCobro = "Pendiente"
        }]);

        var excepcion = await Assert.ThrowsAsync<ValidacionException>(() =>
            _flujo.RegistrarAsync(new RegistrarNotaCreditoDto
            {
                IdFactura = 4,
                Motivo = "Ajuste",
                Monto = 1001
            }, 1));

        Assert.Contains("no puede superar", excepcion.Errores[0]);
    }

    [Fact]
    public async Task RegistrarAsync_FacturaAnulada_LanzaValidacion()
    {
        _facturaDa.ListarAsync().Returns([new FacturaDto
        {
            IdFactura = 4,
            Total = 1000,
            EstadoCobro = "Anulada"
        }]);

        var excepcion = await Assert.ThrowsAsync<ValidacionException>(() =>
            _flujo.RegistrarAsync(new RegistrarNotaCreditoDto
            {
                IdFactura = 4,
                Motivo = "Ajuste",
                Monto = 100
            }, 1));

        Assert.Contains("factura anulada", excepcion.Errores[0]);
    }
}
