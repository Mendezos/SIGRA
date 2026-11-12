using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Servicios;
using SIGRA.API.Controllers;
using SIGRA.Flujo.Flujos;

namespace SIGRA.Pruebas;

// T-02: campana única. Controlador de notificaciones y avisos de las alertas de frecuencias.
public class NotificacionesPruebas
{
    private readonly INotificacionesDA _notificaciones = Substitute.For<INotificacionesDA>();
    private readonly IFrecuenciaDA _frecuenciaDA = Substitute.For<IFrecuenciaDA>();
    private readonly IAuditoriaDA _auditoriaDA = Substitute.For<IAuditoriaDA>();
    private readonly IEmailService _email = Substitute.For<IEmailService>();
    private readonly FrecuenciaFlujo _flujo;

    public NotificacionesPruebas()
    {
        _flujo = new FrecuenciaFlujo(_frecuenciaDA, _auditoriaDA, _email, new ConfigurationBuilder().Build(),
            _notificaciones, NullLogger<FrecuenciaFlujo>.Instance);
        _frecuenciaDA.ListarAlertasPorEnviarAsync(default).ReturnsForAnyArgs(new List<AlertaPorEnviarDto>());
    }

    private static NotificacionesController Controlador(INotificacionesDA da, int idUsuario)
    {
        var identidad = new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, idUsuario.ToString()) }, "prueba");
        return new NotificacionesController(da)
        {
            ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext
            {
                HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext { User = new ClaimsPrincipal(identidad) }
            }
        };
    }

    private static AlertaFrecuenciaDto Alerta(int id, string tipo = "Primera", int idVendedor = 6) => new()
    {
        IdAlerta = id,
        IdSolicitud = 40 + id,
        Tipo = tipo,
        FechaVencimiento = new DateTime(2027, 3, 15),
        DiasRestantes = 120,
        Empresa = "Marina Pez Vela",
        NumeroSerie = "REP-001",
        Frecuencia = "151.250 MHz",
        IdVendedor = idVendedor,
        Vendedor = "Kimberly Sanchez"
    };

    private void PrepararAlertas(params AlertaFrecuenciaDto[] alertas)
    {
        _frecuenciaDA.EvaluarAlertasAsync(default).ReturnsForAnyArgs((alertas.Select(a => a.IdAlerta).ToList(), new List<int>()));
        foreach (var a in alertas) _frecuenciaDA.ListarAlertasAsync(a.IdAlerta, null, null).Returns(new List<AlertaFrecuenciaDto> { a });
    }

    // ---------- Controlador ----------
    [Fact]
    public async Task Listar_resumen_y_leer_todas_usan_siempre_el_usuario_de_la_sesion()
    {
        _notificaciones.ObtenerResumenAsync(9).Returns(new ResumenNotificacionesDto { SinLeer = 3, Total = 7 });
        _notificaciones.MarcarTodasLeidasAsync(9).Returns(3);
        _notificaciones.ListarAsync(9).Returns(new List<NotificacionDto> { new() { IdNotificacion = 1, Tipo = "Seguimiento" } });
        var controlador = Controlador(_notificaciones, 9);

        var resumen = await controlador.Resumen();
        var marcadas = await controlador.LeerTodas();
        var lista = await controlador.Listar();

        Assert.Equal(3, resumen.SinLeer);
        Assert.Equal(7, resumen.Total);
        Assert.Equal(3, marcadas.Marcadas);
        Assert.Equal("Seguimiento", Assert.Single(lista).Tipo);
        await _notificaciones.DidNotReceive().MarcarTodasLeidasAsync(Arg.Is<int>(i => i != 9));
        await _notificaciones.DidNotReceive().ObtenerResumenAsync(Arg.Is<int>(i => i != 9));
    }

    [Fact]
    public async Task Marcar_un_aviso_como_leido_pasa_el_usuario_de_la_sesion()
    {
        var resultado = await Controlador(_notificaciones, 4).Leer(55);

        Assert.IsType<Microsoft.AspNetCore.Mvc.NoContentResult>(resultado);
        await _notificaciones.Received(1).MarcarLeidaAsync(55, 4);
    }

    // ---------- Alertas de frecuencias en la campana ----------
    [Fact]
    public async Task Alerta_nueva_de_frecuencia_avisa_al_vendedor_y_a_los_administradores_sin_correo_extra()
    {
        PrepararAlertas(Alerta(7, "Final"));
        _notificaciones.ListarAdministradoresAsync().Returns(new List<AdministradorDto> { new() { IdUsuario = 1, Nombre = "Admin" } });

        var resultado = await _flujo.ProcesarAlertasAsync();

        Assert.Equal(1, resultado.AlertasGeneradas);
        await _notificaciones.Received(1).RegistrarAsync(6, 11, Arg.Is<string>(t => t.StartsWith("URGENTE") && t.Contains("Marina Pez Vela")),
            Arg.Is<string>(m => m.Contains("SF-0047") && m.Contains("15/03/2027")), "SolicitudFrecuencia", 47, "Frecuencia", "FRQ-7", false);
        await _notificaciones.Received(1).RegistrarAsync(1, 11, Arg.Any<string>(), Arg.Any<string>(), "SolicitudFrecuencia", 47, "Frecuencia", "FRQ-7", false);
    }

    [Fact]
    public async Task Alerta_de_frecuencia_cuyo_vendedor_es_administrador_no_se_duplica()
    {
        PrepararAlertas(Alerta(8, "Primera", idVendedor: 1));
        _notificaciones.ListarAdministradoresAsync().Returns(new List<AdministradorDto> { new() { IdUsuario = 1, Nombre = "Admin" } });

        await _flujo.ProcesarAlertasAsync();

        await _notificaciones.ReceivedWithAnyArgs(1).RegistrarAsync(default, default, default!, default!, default, default, default!, default, default);
    }

    [Fact]
    public async Task Sin_alertas_nuevas_no_se_registran_avisos()
    {
        _frecuenciaDA.EvaluarAlertasAsync(default).ReturnsForAnyArgs((new List<int>(), new List<int>()));

        await _flujo.ProcesarAlertasAsync();

        await _notificaciones.DidNotReceiveWithAnyArgs().RegistrarAsync(default, default, default!, default!, default, default, default!, default, default);
    }

    [Fact]
    public async Task Fallo_del_aviso_de_frecuencia_no_rompe_la_verificacion_ni_las_demas_alertas()
    {
        PrepararAlertas(Alerta(7), Alerta(8, "Segunda", idVendedor: 7));
        _notificaciones.ListarAdministradoresAsync().Returns(new List<AdministradorDto>());
        _notificaciones.RegistrarAsync(6, default, default!, default!, default, default, default!, default, default)
            .ReturnsForAnyArgs(Task.FromException<long>(new InvalidOperationException("BD caída")));

        var resultado = await _flujo.ProcesarAlertasAsync();

        Assert.Equal(2, resultado.AlertasGeneradas);
        await _notificaciones.ReceivedWithAnyArgs(2).RegistrarAsync(default, default, default!, default!, default, default, default!, default, default);
        await _auditoriaDA.Received(2).RegistrarAsync(null, "Frecuencias", "SolicitudFrecuencia", Arg.Any<int>(), "ALERTA_VENCIMIENTO_GENERADA", Arg.Any<string?>());
    }

    [Fact]
    public async Task Fallo_al_listar_administradores_igual_avisa_al_vendedor()
    {
        PrepararAlertas(Alerta(9));
        _notificaciones.ListarAdministradoresAsync().Returns(Task.FromException<List<AdministradorDto>>(new InvalidOperationException("BD caída")));

        var resultado = await _flujo.ProcesarAlertasAsync();

        Assert.Equal(1, resultado.AlertasGeneradas);
        await _notificaciones.Received(1).RegistrarAsync(6, 11, Arg.Any<string>(), Arg.Any<string>(), "SolicitudFrecuencia", 49, "Frecuencia", "FRQ-9", false);
    }
}
