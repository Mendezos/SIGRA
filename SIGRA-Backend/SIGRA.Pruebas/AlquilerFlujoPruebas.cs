using NSubstitute;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Servicios;
using SIGRA.Flujo.Flujos;

namespace SIGRA.Pruebas;

public class AlquilerFlujoPruebas
{
    private readonly IAlquilerDA _alquilerDA = Substitute.For<IAlquilerDA>();
    private readonly IInventarioDA _inventarioDA = Substitute.For<IInventarioDA>();
    private readonly IAuditoriaDA _auditoriaDA = Substitute.For<IAuditoriaDA>();
    private readonly IEmailService _email = Substitute.For<IEmailService>();
    private readonly AlquilerFlujo _flujo;

    public AlquilerFlujoPruebas()
    {
        _flujo = new AlquilerFlujo(_alquilerDA, _inventarioDA, _auditoriaDA, _email);
    }

    private static EquipoDetalleDto Equipo(string serie, string estado = "Disponible", bool porCantidad = false) => new()
    {
        IdEquipo = 1,
        NumeroSerie = serie,
        Estado = estado,
        ManejaCantidad = porCantidad,
        Categoria = "Radio portátil"
    };

    private static ContratoDto Contrato(string estado, DateTime? vence = null, int? vendedor = 6) => new()
    {
        IdContrato = 3,
        Empresa = "Hotel Los Sueños",
        Estado = estado,
        EstadoRegistrado = estado is "Cancelado" or "Vencido" ? estado : "Activo",
        FechaInicio = DateTime.Today.AddYears(-1),
        FechaVencimiento = vence ?? DateTime.Today.AddDays(20),
        MontoMensual = 85000,
        IdVendedor = vendedor
    };

    private static RegistrarContratoDto ContratoValido() => new()
    {
        Empresa = "Hotel Los Sueños",
        FechaInicio = DateTime.Today,
        FechaVencimiento = DateTime.Today.AddYears(1),
        MontoMensual = 50000,
        Series = new List<string> { "SN-1" }
    };

    // ---------- CARR-002: registrar contrato ----------
    [Fact]
    public async Task RegistrarContrato_sin_campos_obligatorios_lista_los_faltantes()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarContratoAsync(new RegistrarContratoDto(), null, 1));

        Assert.Equal("Debe completar los campos obligatorios para registrar el contrato.", ex.Message);
        Assert.Contains("Empresa cliente", ex.Errores);
        Assert.Contains("Monto mensual", ex.Errores);
        Assert.Contains("Fecha de inicio", ex.Errores);
    }

    [Fact]
    public async Task RegistrarContrato_con_vencimiento_igual_al_inicio_se_rechaza()
    {
        var dto = ContratoValido();
        dto.FechaVencimiento = dto.FechaInicio;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarContratoAsync(dto, null, 1));

        Assert.Equal("La fecha de vencimiento debe ser posterior a la fecha de inicio del contrato.", ex.Message);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public async Task RegistrarContrato_con_monto_no_positivo_se_rechaza(double monto)
    {
        var dto = ContratoValido();
        dto.MontoMensual = (decimal)monto;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarContratoAsync(dto, null, 1));

        Assert.Equal("El monto mensual debe ser un valor numérico mayor a cero.", ex.Message);
    }

    [Fact]
    public async Task RegistrarContrato_con_serie_inexistente_indica_que_no_existe()
    {
        _inventarioDA.ObtenerEquipoAsync(null, "SN-1").Returns((EquipoDetalleDto?)null);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarContratoAsync(ContratoValido(), null, 1));

        Assert.Contains("no existe en el inventario", ex.Message);
        await _alquilerDA.DidNotReceiveWithAnyArgs().InsertarContratoAsync(default!, default, default, default, default, default, default!, default, default);
    }

    [Theory]
    [InlineData("Alquilado")]
    [InlineData("En mantenimiento")]
    [InlineData("En reparación")]
    [InlineData("Dado de baja")]
    public async Task RegistrarContrato_con_equipo_no_disponible_se_rechaza(string estado)
    {
        _inventarioDA.ObtenerEquipoAsync(null, "SN-1").Returns(Equipo("SN-1", estado));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarContratoAsync(ContratoValido(), null, 1));

        Assert.Contains("no se encuentra disponible", ex.Message);
        Assert.Contains(estado, ex.Message);
    }

    [Fact]
    public async Task RegistrarContrato_valido_guarda_y_deja_bitacora()
    {
        _inventarioDA.ObtenerEquipoAsync(null, "SN-1").Returns(Equipo("SN-1"));
        _alquilerDA.InsertarContratoAsync(default!, default, default, default, default, default, default!, default, default)
            .ReturnsForAnyArgs(3);
        _alquilerDA.ObtenerContratoAsync(3).Returns(Contrato("Activo"));
        _alquilerDA.ListarEquiposDeContratoAsync(3).Returns(new List<ContratoEquipoDto> { new() { IdEquipo = 1, NumeroSerie = "SN-1" } });
        _alquilerDA.ListarAccesoriosDeContratoAsync(3).Returns(new List<ContratoAccesorioDto>());

        var detalle = await _flujo.RegistrarContratoAsync(ContratoValido(), 6, 6);

        Assert.Equal(3, detalle.Contrato.IdContrato);
        await _auditoriaDA.Received(1).RegistrarAsync(6, "Alquiler", "Contrato", 3, "CONTRATO_REGISTRADO", Arg.Any<string?>());
    }

    // ---------- CARR-003: renovar ----------
    private void PrepararContrato(ContratoDto contrato)
    {
        _alquilerDA.ObtenerContratoAsync(contrato.IdContrato).Returns(contrato);
        _alquilerDA.ListarEquiposDeContratoAsync(contrato.IdContrato)
            .Returns(new List<ContratoEquipoDto> { new() { IdEquipo = 1, NumeroSerie = "SN-1" } });
        _alquilerDA.ListarAccesoriosDeContratoAsync(contrato.IdContrato).Returns(new List<ContratoAccesorioDto>());
    }

    [Fact]
    public async Task Renovar_un_contrato_que_aun_no_esta_en_periodo_de_renovacion_se_rechaza()
    {
        PrepararContrato(Contrato("Activo", DateTime.Today.AddDays(200)));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.RenovarContratoAsync(3, new RenovarContratoDto { NuevaFechaVencimiento = DateTime.Today.AddYears(2) }, 1, true));

        Assert.Equal("El contrato aún no se encuentra en periodo de renovación.", ex.Message);
    }

    [Fact]
    public async Task Renovar_un_contrato_cancelado_se_rechaza()
    {
        PrepararContrato(Contrato("Cancelado"));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.RenovarContratoAsync(3, new RenovarContratoDto { NuevaFechaVencimiento = DateTime.Today.AddYears(2) }, 1, true));

        Assert.Equal("No es posible renovar un contrato cancelado.", ex.Message);
    }

    [Fact]
    public async Task Renovar_con_fecha_que_no_supera_el_vencimiento_se_rechaza()
    {
        var contrato = Contrato("Por vencer (30 días)", DateTime.Today.AddDays(10));
        PrepararContrato(contrato);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.RenovarContratoAsync(3, new RenovarContratoDto { NuevaFechaVencimiento = contrato.FechaVencimiento }, 1, true));

        Assert.Contains("posterior a la fecha de vencimiento actual", ex.Message);
    }

    [Fact]
    public async Task Renovar_un_vendedor_no_puede_renovar_contratos_ajenos()
    {
        PrepararContrato(Contrato("Por vencer (30 días)", vendedor: 99));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.RenovarContratoAsync(3, new RenovarContratoDto { NuevaFechaVencimiento = DateTime.Today.AddYears(1) }, 6, false));

        Assert.Contains("que usted registró", ex.Message);
    }

    [Fact]
    public async Task Renovar_valido_registra_la_renovacion_y_la_auditoria()
    {
        PrepararContrato(Contrato("Por vencer (30 días)", DateTime.Today.AddDays(10)));

        await _flujo.RenovarContratoAsync(3, new RenovarContratoDto { NuevaFechaVencimiento = DateTime.Today.AddYears(1) }, 1, true);

        await _alquilerDA.Received(1).RenovarContratoAsync(3, Arg.Any<DateTime>(), null, Arg.Any<IEnumerable<int>>(),
            Arg.Any<IEnumerable<int>>(), null, 1);
        await _auditoriaDA.Received().RegistrarAsync(1, "Alquiler", "Contrato", 3, "CONTRATO_RENOVADO", Arg.Any<string?>());
    }

    [Fact]
    public async Task Renovar_sin_dejar_equipos_en_el_contrato_se_rechaza()
    {
        PrepararContrato(Contrato("Vencido"));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.RenovarContratoAsync(3, new RenovarContratoDto
            {
                NuevaFechaVencimiento = DateTime.Today.AddYears(1),
                IdsRetirar = new List<int> { 1 }
            }, 1, true));

        Assert.Contains("al menos un equipo", ex.Message);
    }

    // ---------- CARR-004: cancelar ----------
    [Fact]
    public async Task Cancelar_sin_motivo_se_rechaza()
    {
        PrepararContrato(Contrato("Activo", DateTime.Today.AddDays(200)));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CancelarContratoAsync(3, new CancelarContratoDto(), 1));

        Assert.Equal("Debe indicar el motivo de la cancelación.", ex.Message);
    }

    [Theory]
    [InlineData("Vencido")]
    [InlineData("Cancelado")]
    public async Task Cancelar_un_contrato_que_ya_no_esta_activo_se_rechaza(string estado)
    {
        PrepararContrato(Contrato(estado));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.CancelarContratoAsync(3, new CancelarContratoDto { Motivo = "x" }, 1));

        Assert.Equal("El contrato no puede cancelarse porque ya no se encuentra activo.", ex.Message);
    }

    [Fact]
    public async Task Cancelar_valido_libera_equipos_y_deja_auditoria()
    {
        PrepararContrato(Contrato("Activo", DateTime.Today.AddDays(200)));

        await _flujo.CancelarContratoAsync(3, new CancelarContratoDto { Motivo = "El cliente no continúa" }, 1);

        await _alquilerDA.Received(1).CancelarContratoAsync(3, "El cliente no continúa", 1);
        await _auditoriaDA.Received().RegistrarAsync(1, "Alquiler", "Contrato", 3, "CONTRATO_CANCELADO", Arg.Any<string?>());
    }

    // ---------- CARR-001: contacto inicial ----------
    private static RegistrarContactoDto ContactoValido() => new()
    {
        Empresa = "Marina Pez Vela",
        MedioContacto = "Correo",
        DatoContacto = "daniela@pezvela.example",
        Motivo = "Alquiler de 6 radios"
    };

    private void PrepararInsertContacto(int idContacto = 10)
    {
        _alquilerDA.InsertarContactoAsync(default!, default, default!, default!, default, default, default, default)
            .ReturnsForAnyArgs(idContacto);
        _alquilerDA.ListarContactosAsync(null).Returns(new List<ContactoDto>
        {
            new() { IdContacto = idContacto, Empresa = "Marina Pez Vela", Vendedor = "Kimberly Sanchez", IdVendedor = 6 }
        });
        _alquilerDA.ObtenerHistorialContactoAsync(idContacto).Returns(new List<ContactoHistorialDto>());
    }

    [Fact]
    public async Task Contacto_sin_empresa_o_medio_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.RegistrarContactoAsync(new RegistrarContactoDto { MedioContacto = "Correo" }, 1));

        Assert.Equal("Debe ingresar al menos el nombre de la empresa y un medio de contacto.", ex.Message);
    }

    [Fact]
    public async Task Contacto_se_asigna_al_vendedor_que_indica_la_cascada()
    {
        PrepararInsertContacto();
        _alquilerDA.ObtenerSiguienteVendedorCascadaAsync().Returns(new VendedorDto { IdUsuario = 6, Nombre = "Kimberly Sanchez" });

        var resultado = await _flujo.RegistrarContactoAsync(ContactoValido(), 1);

        Assert.False(resultado.RequiereConfirmacion);
        await _alquilerDA.Received(1).InsertarContactoAsync("Marina Pez Vela", null, "Correo", "daniela@pezvela.example",
            "Alquiler de 6 radios", 6, "Asignación en cascada", 1);
    }

    [Fact]
    public async Task Contacto_sin_vendedores_disponibles_queda_en_espera()
    {
        PrepararInsertContacto();
        _alquilerDA.ObtenerSiguienteVendedorCascadaAsync().Returns((VendedorDto?)null);

        await _flujo.RegistrarContactoAsync(ContactoValido(), 1);

        await _alquilerDA.Received(1).InsertarContactoAsync(Arg.Any<string>(), Arg.Any<string?>(), Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<string?>(), null, Arg.Any<string?>(), 1);
        await _auditoriaDA.Received().RegistrarAsync(1, "Alquiler", "ContactoInicial", 10, "CONTACTO_SIN_VENDEDOR", Arg.Any<string?>());
    }

    [Fact]
    public async Task Contacto_repetido_en_24_horas_pide_confirmacion_y_no_se_guarda()
    {
        _alquilerDA.ObtenerContactoRecienteAsync("Marina Pez Vela")
            .Returns(new ContactoRecienteDto { IdContacto = 4, Empresa = "Marina Pez Vela", FechaRegistro = DateTime.Now.AddHours(-3) });

        var resultado = await _flujo.RegistrarContactoAsync(ContactoValido(), 1);

        Assert.True(resultado.RequiereConfirmacion);
        await _alquilerDA.DidNotReceiveWithAnyArgs().InsertarContactoAsync(default!, default, default!, default!, default, default, default, default);
    }

    [Fact]
    public async Task Reasignar_contacto_exige_motivo()
    {
        _alquilerDA.ExisteContactoAsync(10).Returns(true);

        await Assert.ThrowsAsync<ValidacionException>(() =>
            _flujo.ReasignarContactoAsync(10, new ReasignarContactoDto { IdVendedor = 6 }, 1));
    }

    // ---------- CARR-007: baterías ----------
    [Fact]
    public async Task Cambio_de_bateria_sin_serie_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.RegistrarCambioBateriaAsync(new RegistrarBateriaDto { IdEquipo = 7 }, 1));

        Assert.Equal("Debe indicar el número de serie de la batería nueva.", ex.Message);
    }

    [Fact]
    public async Task Cambio_de_bateria_con_fecha_futura_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.RegistrarCambioBateriaAsync(new RegistrarBateriaDto
            {
                IdEquipo = 7,
                NumeroSerieBateria = "KNB45-1",
                FechaCambio = DateTime.Today.AddDays(2)
            }, 1));

        Assert.Equal("La fecha del cambio no puede ser futura.", ex.Message);
    }

    // ---------- CARR-005: vencimientos y alertas ----------
    [Fact]
    public async Task Alerta_se_registra_cuando_el_correo_sale()
    {
        _alquilerDA.MarcarContratosVencidosAsync().Returns(0);
        _alquilerDA.ListarAlertasPendientesAsync().Returns(new List<AlertaContratoDto>
        {
            new() { IdContrato = 3, Empresa = "Hotel", CorreoCliente = "c@hotel.example", Tipo = "30 dias", FechaVencimiento = DateTime.Today.AddDays(20) }
        });
        _alquilerDA.ListarAdministradoresAsync().Returns(new List<AdministradorDto>());

        var resultado = await _flujo.ProcesarVencimientosAsync();

        Assert.Equal(1, resultado.AlertasGeneradas);
        await _alquilerDA.Received(1).RegistrarAlertaAsync(3, "30 dias");
    }

    [Fact]
    public async Task Alerta_no_se_registra_si_ningun_correo_pudo_enviarse()
    {
        _alquilerDA.ListarAlertasPendientesAsync().Returns(new List<AlertaContratoDto>
        {
            new() { IdContrato = 3, Empresa = "Hotel", CorreoCliente = "c@hotel.example", Tipo = "90 dias", FechaVencimiento = DateTime.Today.AddDays(80) }
        });
        _alquilerDA.ListarAdministradoresAsync().Returns(new List<AdministradorDto>());
        _email.EnviarAsync(default!, default!, default!, default!).ReturnsForAnyArgs(Task.FromException(new InvalidOperationException("sin clave")));

        var resultado = await _flujo.ProcesarVencimientosAsync();

        Assert.Equal(0, resultado.AlertasGeneradas);
        Assert.Single(resultado.Errores);
        await _alquilerDA.DidNotReceiveWithAnyArgs().RegistrarAlertaAsync(default, default!);
    }
}
