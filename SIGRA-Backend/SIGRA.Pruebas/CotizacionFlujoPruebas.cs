using NSubstitute;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Flujo.Flujos;

namespace SIGRA.Pruebas;

public class CotizacionFlujoPruebas
{
    private readonly ICotizacionDA _da = Substitute.For<ICotizacionDA>();
    private readonly CotizacionFlujo _flujo;

    public CotizacionFlujoPruebas()
    {
        _flujo = new CotizacionFlujo(_da);
    }

    [Fact]
    public async Task RegistrarAsync_CotizacionValida_CalculaMontoYGuardaBorrador()
    {
        var dto = new RegistrarCotizacionDto
        {
            IdProspecto = 10,
            Lineas =
            [
                new LineaCotizacionDto
                {
                    IdProducto = 5,
                    Descripcion = "Repetidora",
                    Cantidad = 2,
                    PrecioUnitario = 150000
                }
            ]
        };

        _da.RegistrarAsync(Arg.Any<CotizacionDto>())
            .Returns(call => call.Arg<CotizacionDto>());

        var resultado = await _flujo.RegistrarAsync(dto, 1);

        Assert.Equal(300000, resultado.Monto);
        Assert.Equal("Borrador", resultado.Estado);
        Assert.True(resultado.Activa);
        await _da.Received(1).RegistrarAsync(Arg.Is<CotizacionDto>(cotizacion =>
            cotizacion.IdProspecto == 10 &&
            cotizacion.Monto == 300000 &&
            cotizacion.Estado == "Borrador"));
    }

    [Fact]
    public async Task RegistrarAsync_SinLineas_LanzaValidacion()
    {
        var dto = new RegistrarCotizacionDto { IdProspecto = 10 };

        var excepcion = await Assert.ThrowsAsync<ValidacionException>(
            () => _flujo.RegistrarAsync(dto, 1));

        Assert.Contains(
            "Debe agregar al menos una línea de cotización.",
            excepcion.Errores);
    }

    [Fact]
    public async Task RegistrarAsync_CantidadCero_LanzaValidacion()
    {
        var dto = new RegistrarCotizacionDto
        {
            IdProspecto = 10,
            Lineas =
            [
                new LineaCotizacionDto
                {
                    IdProducto = 5,
                    Cantidad = 0,
                    PrecioUnitario = 100
                }
            ]
        };

        var excepcion = await Assert.ThrowsAsync<ValidacionException>(
            () => _flujo.RegistrarAsync(dto, 1));

        Assert.Contains(
            "La cantidad debe ser mayor que cero.",
            excepcion.Errores);
    }

    [Fact]
    public async Task ObtenerAsync_IdInexistente_RetornaNull()
    {
        _da.ObtenerAsync(99).Returns((CotizacionDto?)null);

        var resultado = await _flujo.ObtenerAsync(99);

        Assert.Null(resultado);
    }

    [Fact]
    public async Task ActualizarAsync_Borrador_RecalculaMontoYConservaEstado()
    {
        var existente = new CotizacionDto
        {
            IdCotizacion = 4,
            IdProspecto = 10,
            Fecha = DateOnly.FromDateTime(DateTime.Today),
            Estado = "Borrador",
            Activa = true,
        };
        _da.ObtenerAsync(4).Returns(existente);
        _da.ActualizarAsync(Arg.Any<CotizacionDto>())
            .Returns(call => call.Arg<CotizacionDto>());

        var resultado = await _flujo.ActualizarAsync(4, new RegistrarCotizacionDto
        {
            IdProspecto = 11,
            Lineas =
            [
                new LineaCotizacionDto
                {
                    IdProducto = 8,
                    Cantidad = 3,
                    PrecioUnitario = 35000
                }
            ]
        }, 1);

        Assert.Equal(105000, resultado.Monto);
        Assert.Equal("Borrador", resultado.Estado);
        Assert.Equal(11, resultado.IdProspecto);
        await _da.Received(1).ActualizarAsync(Arg.Is<CotizacionDto>(
            cotizacion => cotizacion.IdCotizacion == 4));
    }

    [Fact]
    public async Task ActualizarAsync_CotizacionNoBorrador_LanzaReglaDeNegocio()
    {
        _da.ObtenerAsync(4).Returns(new CotizacionDto
        {
            IdCotizacion = 4,
            Estado = "Enviada",
        });

        var excepcion = await Assert.ThrowsAsync<ReglaNegocioException>(
            () => _flujo.ActualizarAsync(4, new RegistrarCotizacionDto(), 1));

        Assert.Equal(
            "Solo se pueden editar cotizaciones en estado Borrador.",
            excepcion.Message);
        await _da.DidNotReceive().ActualizarAsync(Arg.Any<CotizacionDto>());
    }

    [Fact]
    public async Task RegistrarAsync_FechaAnteriorAHoy_LanzaValidacion()
    {
        var dto = new RegistrarCotizacionDto
        {
            IdProspecto = 10,
            Fecha = DateOnly.FromDateTime(DateTime.Today.AddDays(-1)),
            Lineas =
            [
                new LineaCotizacionDto
                {
                    IdProducto = 5,
                    Cantidad = 1,
                    PrecioUnitario = 100
                }
            ]
        };

        var excepcion = await Assert.ThrowsAsync<ValidacionException>(
            () => _flujo.RegistrarAsync(dto, 1));

        Assert.Contains(
            "La fecha de la cotización no puede ser anterior a hoy.",
            excepcion.Errores);
    }

    [Fact]
    public async Task CambiarEstadoAsync_TransicionPermitida_ActualizaEstado()
    {
        _da.ObtenerAsync(4).Returns(new CotizacionDto
        {
            IdCotizacion = 4,
            Estado = "Borrador",
            Activa = true,
        });
        _da.CambiarEstadoAsync(4, "Enviada")
            .Returns(new CotizacionDto { IdCotizacion = 4, Estado = "Enviada", Activa = true });

        var resultado = await _flujo.CambiarEstadoAsync(
            4,
            new CambiarEstadoCotizacionDto { Estado = "Enviada" },
            1);

        Assert.Equal("Enviada", resultado.Estado);
        await _da.Received(1).CambiarEstadoAsync(4, "Enviada");
    }

    [Fact]
    public async Task CambiarEstadoAsync_TransicionNoPermitida_LanzaReglaDeNegocio()
    {
        _da.ObtenerAsync(4).Returns(new CotizacionDto
        {
            IdCotizacion = 4,
            Estado = "Borrador",
        });

        var excepcion = await Assert.ThrowsAsync<ReglaNegocioException>(
            () => _flujo.CambiarEstadoAsync(
                4,
                new CambiarEstadoCotizacionDto { Estado = "Aprobada" },
                1));

        Assert.Contains("No se puede cambiar", excepcion.Message);
        await _da.DidNotReceive().CambiarEstadoAsync(Arg.Any<int>(), Arg.Any<string>());
    }

    [Fact]
    public async Task DesactivarAsync_Anulada_ConservaRegistroYLaMarcaInactiva()
    {
        _da.ObtenerAsync(4).Returns(new CotizacionDto
        {
            IdCotizacion = 4,
            Estado = "Anulada",
            Activa = true,
        });
        _da.CambiarActivaAsync(4, false)
            .Returns(new CotizacionDto { IdCotizacion = 4, Estado = "Anulada", Activa = false });

        var resultado = await _flujo.DesactivarAsync(4, 1);

        Assert.False(resultado.Activa);
        await _da.Received(1).CambiarActivaAsync(4, false);
    }

    [Fact]
    public async Task DesactivarAsync_CotizacionNoAnulada_LanzaReglaDeNegocio()
    {
        _da.ObtenerAsync(4).Returns(new CotizacionDto
        {
            IdCotizacion = 4,
            Estado = "Enviada",
            Activa = true,
        });

        var excepcion = await Assert.ThrowsAsync<ReglaNegocioException>(
            () => _flujo.DesactivarAsync(4, 1));

        Assert.Equal("Solo se pueden desactivar cotizaciones anuladas.", excepcion.Message);
        await _da.DidNotReceive().CambiarActivaAsync(Arg.Any<int>(), Arg.Any<bool>());
    }
}
