using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.API.Servicios;
using SIGRA.Flujo.Flujos;

namespace SIGRA.Pruebas;

// CRMGPSC-025 (recordatorios de baterías) y T-02 (servicio de recordatorios).
public class CrmRecordatoriosFlujoPruebas
{
    private readonly ICrmRecordatoriosDA _da = Substitute.For<ICrmRecordatoriosDA>();
    private readonly ICrmCatalogosDA _catalogos = Substitute.For<ICrmCatalogosDA>();
    private readonly IAuditoriaDA _auditoria = Substitute.For<IAuditoriaDA>();
    private readonly RelojFijo _reloj = new(new DateTimeOffset(2026, 11, 12, 15, 0, 0, TimeSpan.Zero)); // 12-nov-2026 09:00 en Costa Rica
    private readonly CrmRecordatoriosFlujo _flujo;

    public CrmRecordatoriosFlujoPruebas()
    {
        _flujo = new CrmRecordatoriosFlujo(_da, _catalogos, _auditoria, _reloj);

        _catalogos.ObtenerEmpresaAsync("Cliente", 3).Returns(new CrmEmpresaBasicaDto { Tipo = "Cliente", IdEmpresa = 3, Empresa = "Bomberos", Activa = true, IdVendedor = 6 });
        _catalogos.ListarVendedoresAsync().Returns(new List<VendedorDto> { new() { IdUsuario = 6, Nombre = "Kimberly" }, new() { IdUsuario = 7, Nombre = "Henry" } });
        _catalogos.ListarContactosAsync("Cliente", 3, false).Returns(new List<CrmContactoCatalogoDto>
        {
            new() { IdContactoEmpresa = 10, Nombre = "Laura", Activo = true },
            new() { IdContactoEmpresa = 11, Nombre = "Pedro", Activo = false }
        });
        _da.ListarModelosAsync().Returns(new List<BateriaModeloDto> { new() { IdModelo = 6, Marca = "Kenwood", Modelo = "KNB-45", Nombre = "Kenwood KNB-45" } });
        _da.RegistrarAsync(Arg.Any<int>(), Arg.Any<int?>(), Arg.Any<int?>(), Arg.Any<string?>(), Arg.Any<int?>(), Arg.Any<string?>(),
            Arg.Any<int>(), Arg.Any<DateTime>(), Arg.Any<int>(), Arg.Any<int>()).Returns((21, new List<int>()));
        _da.ObtenerAsync(21).Returns(Recordatorio(21));
    }

    private sealed class RelojFijo(DateTimeOffset ahora) : TimeProvider
    {
        public DateTimeOffset Ahora { get; set; } = ahora;
        public override DateTimeOffset GetUtcNow() => Ahora;
    }

    private static RecordatorioBateriaDto Recordatorio(int id, string estado = "Pendiente", int? idNuevo = null) => new()
    {
        IdRecordatorio = id,
        IdCliente = 3,
        Cliente = "Bomberos",
        ModeloBateria = "Kenwood KNB-45",
        Cantidad = 2,
        FechaCompra = new DateTime(2026, 1, 10),
        FechaRecordatorio = new DateTime(2026, 12, 10),
        IdVendedor = 6,
        Vendedor = "Kimberly",
        Estado = estado,
        IdRecordatorioNuevo = idNuevo
    };

    private static RegistrarCompraBateriaDto CompraValida() => new()
    {
        IdCliente = 3,
        IdModelo = 6,
        Cantidad = 2,
        FechaCompra = new DateTime(2026, 1, 10),
        NumeroFactura = "  F-100 "
    };

    // ---------- Registro de la compra ----------
    [Fact]
    public async Task Registrar_sin_campos_obligatorios_lista_los_faltantes()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarAsync(new RegistrarCompraBateriaDto(), 6));

        Assert.Equal("Debe completar los campos obligatorios para registrar la compra de batería.", ex.Message);
        Assert.Equivalent(new[] { "Cliente", "Modelo de la batería", "Cantidad", "Fecha de compra" }, ex.Errores);
    }

    [Fact]
    public async Task Registrar_con_modelo_en_blanco_cuenta_como_faltante()
    {
        var dto = CompraValida();
        dto.IdModelo = null;
        dto.ModeloBateria = "   ";

        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarAsync(dto, 6));

        Assert.Equal(new[] { "Modelo de la batería" }, ex.Errores);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    public async Task Registrar_con_cantidad_menor_a_uno_se_rechaza(int cantidad)
    {
        var dto = CompraValida();
        dto.Cantidad = cantidad;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarAsync(dto, 6));

        Assert.Equal("La cantidad debe ser un número entero mayor o igual a 1.", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().RegistrarAsync(default, default, default, default, default, default, default, default, default, default);
    }

    [Fact]
    public async Task Registrar_con_cantidad_exagerada_se_rechaza()
    {
        var dto = CompraValida();
        dto.Cantidad = 10_000;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarAsync(dto, 6));

        Assert.Contains("no puede superar", ex.Message);
    }

    [Fact]
    public async Task Registrar_con_fecha_futura_se_rechaza()
    {
        var dto = CompraValida();
        dto.FechaCompra = new DateTime(2026, 11, 13);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarAsync(dto, 6));

        Assert.Equal("La fecha de compra no puede ser futura.", ex.Message);
    }

    [Fact]
    public async Task Registrar_acepta_la_fecha_de_hoy_segun_la_hora_de_Costa_Rica_y_no_la_de_UTC()
    {
        // 13-nov 03:00 UTC = 12-nov 21:00 en Costa Rica: "hoy" todavía es 12 de noviembre.
        _reloj.Ahora = new DateTimeOffset(2026, 11, 13, 3, 0, 0, TimeSpan.Zero);
        var dto = CompraValida();
        dto.FechaCompra = new DateTime(2026, 11, 12);
        await _flujo.RegistrarAsync(dto, 6);

        dto.FechaCompra = new DateTime(2026, 11, 13);
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarAsync(dto, 6));
    }

    [Fact]
    public async Task Registrar_con_fecha_inexistente_o_muy_antigua_se_rechaza()
    {
        var dto = CompraValida();
        dto.FechaCompra = new DateTime(1999, 12, 31);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarAsync(dto, 6));

        Assert.Equal("La fecha de compra no es válida.", ex.Message);
    }

    [Fact]
    public async Task Registrar_con_datos_demasiado_largos_se_rechaza()
    {
        var dto = CompraValida();
        dto.NumeroFactura = new string('F', 31);
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarAsync(dto, 6));
        Assert.Equal("El número de factura no puede superar los 30 caracteres.", ex.Message);

        dto = CompraValida();
        dto.IdModelo = null;
        dto.ModeloBateria = new string('M', 151);
        ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarAsync(dto, 6));
        Assert.Equal("El modelo de la batería no puede superar los 150 caracteres.", ex.Message);
    }

    [Fact]
    public async Task Registrar_con_cliente_inexistente_se_rechaza()
    {
        var dto = CompraValida();
        dto.IdCliente = 99;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarAsync(dto, 6));

        Assert.Equal("El cliente indicado no existe.", ex.Message);
    }

    [Fact]
    public async Task Registrar_con_cliente_inactivo_se_rechaza()
    {
        _catalogos.ObtenerEmpresaAsync("Cliente", 3).Returns(new CrmEmpresaBasicaDto { Tipo = "Cliente", IdEmpresa = 3, Empresa = "Bomberos", Activa = false });

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarAsync(CompraValida(), 6));

        Assert.Equal("El cliente está inactivo; no se pueden registrar compras de batería.", ex.Message);
    }

    [Fact]
    public async Task Registrar_con_contacto_de_otro_cliente_o_inactivo_se_rechaza()
    {
        var dto = CompraValida();
        dto.IdContactoEmpresa = 99;
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarAsync(dto, 6));
        Assert.Equal("El contacto indicado no pertenece al cliente.", ex.Message);

        dto.IdContactoEmpresa = 11;
        ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarAsync(dto, 6));
        Assert.Equal("El contacto indicado está inactivo.", ex.Message);
    }

    [Fact]
    public async Task Registrar_con_modelo_que_no_es_del_catalogo_de_baterias_se_rechaza()
    {
        var dto = CompraValida();
        dto.IdModelo = 1;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarAsync(dto, 6));

        Assert.Equal("El modelo indicado no es una batería del catálogo.", ex.Message);
    }

    [Fact]
    public async Task Registrar_con_vendedor_elegido_inactivo_se_rechaza()
    {
        var dto = CompraValida();
        dto.IdVendedor = 99;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarAsync(dto, 6));

        Assert.Equal("El vendedor responsable debe ser un vendedor activo.", ex.Message);
    }

    [Fact]
    public async Task Registrar_sin_vendedor_usa_el_del_cliente()
    {
        await _flujo.RegistrarAsync(CompraValida(), 1);

        await _da.Received(1).RegistrarAsync(3, null, null, "F-100", 6, null, 2, new DateTime(2026, 1, 10), 6, 1);
    }

    [Fact]
    public async Task Registrar_sin_vendedor_si_el_del_cliente_esta_inactivo_usa_al_usuario_vendedor()
    {
        _catalogos.ObtenerEmpresaAsync("Cliente", 3).Returns(new CrmEmpresaBasicaDto { Tipo = "Cliente", IdEmpresa = 3, Empresa = "Bomberos", Activa = true, IdVendedor = 99 });

        await _flujo.RegistrarAsync(CompraValida(), 7);

        await _da.Received(1).RegistrarAsync(3, null, null, "F-100", 6, null, 2, new DateTime(2026, 1, 10), 7, 7);
    }

    [Fact]
    public async Task Registrar_sin_vendedor_posible_pide_elegir_uno()
    {
        _catalogos.ObtenerEmpresaAsync("Cliente", 3).Returns(new CrmEmpresaBasicaDto { Tipo = "Cliente", IdEmpresa = 3, Empresa = "Bomberos", Activa = true, IdVendedor = null });

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarAsync(CompraValida(), 1));

        Assert.Equal("El cliente no tiene un vendedor activo asignado; seleccione el vendedor responsable.", ex.Message);
    }

    [Fact]
    public async Task Registrar_camino_feliz_normaliza_audita_y_explica_la_fecha_de_recordatorio()
    {
        var dto = CompraValida();
        dto.IdContactoEmpresa = 10;
        dto.IdVendedor = 7;

        var resultado = await _flujo.RegistrarAsync(dto, 6);

        await _da.Received(1).RegistrarAsync(3, 10, null, "F-100", 6, null, 2, new DateTime(2026, 1, 10), 7, 6);
        await _auditoria.Received(1).RegistrarAsync(6, "CRM", "RecordatorioBateria", 21, "BATERIA_REGISTRADA", Arg.Is<string>(d => d.Contains("BT-0021") && d.Contains("10/12/2026")));
        Assert.Equal(21, resultado.Recordatorio.IdRecordatorio);
        Assert.Empty(resultado.Cerrados);
        Assert.Contains("BT-0021", resultado.Mensaje);
        Assert.Contains("10/12/2026", resultado.Mensaje);
        Assert.Contains("11 meses", resultado.Mensaje);
    }

    [Fact]
    public async Task Registrar_con_texto_libre_envia_el_texto_y_sin_modelo_del_catalogo()
    {
        var dto = CompraValida();
        dto.IdModelo = null;
        dto.ModeloBateria = "  Motorola NNTN8128  ";

        await _flujo.RegistrarAsync(dto, 6);

        await _da.Received(1).RegistrarAsync(3, null, null, "F-100", null, "Motorola NNTN8128", 2, new DateTime(2026, 1, 10), 6, 6);
    }

    [Fact]
    public async Task Registrar_con_modelo_del_catalogo_ignora_el_texto_para_que_coincida_siempre()
    {
        var dto = CompraValida();
        dto.ModeloBateria = "otro texto";

        await _flujo.RegistrarAsync(dto, 6);

        await _da.Received(1).RegistrarAsync(3, null, null, "F-100", 6, null, 2, Arg.Any<DateTime>(), 6, 6);
    }

    [Fact]
    public async Task Registrar_cambio_anticipado_informa_y_audita_el_cierre_del_anterior()
    {
        _da.RegistrarAsync(Arg.Any<int>(), Arg.Any<int?>(), Arg.Any<int?>(), Arg.Any<string?>(), Arg.Any<int?>(), Arg.Any<string?>(),
            Arg.Any<int>(), Arg.Any<DateTime>(), Arg.Any<int>(), Arg.Any<int>()).Returns((21, new List<int> { 4, 9 }));

        var resultado = await _flujo.RegistrarAsync(CompraValida(), 6);

        Assert.Equal(new[] { 4, 9 }, resultado.Cerrados);
        Assert.Contains("BT-0004, BT-0009", resultado.Mensaje);
        Assert.Contains("antes del plazo", resultado.Mensaje);
        await _auditoria.Received(1).RegistrarAsync(6, "CRM", "RecordatorioBateria", 4, "BATERIA_CERRADA", Arg.Is<string>(d => d.Contains("BT-0021")));
        await _auditoria.Received(1).RegistrarAsync(6, "CRM", "RecordatorioBateria", 9, "BATERIA_CERRADA", Arg.Any<string>());
    }

    [Fact]
    public async Task Registrar_compra_anterior_a_una_existente_nace_cerrada_y_lo_explica()
    {
        _da.ObtenerAsync(21).Returns(Recordatorio(21, "Cerrado", idNuevo: 30));

        var resultado = await _flujo.RegistrarAsync(CompraValida(), 6);

        Assert.Contains("compra más reciente", resultado.Mensaje);
        Assert.Contains("BT-0030", resultado.Mensaje);
    }

    [Fact]
    public async Task Registrar_los_errores_de_la_base_de_datos_se_propagan_sin_auditar()
    {
        _da.RegistrarAsync(Arg.Any<int>(), Arg.Any<int?>(), Arg.Any<int?>(), Arg.Any<string?>(), Arg.Any<int?>(), Arg.Any<string?>(),
            Arg.Any<int>(), Arg.Any<DateTime>(), Arg.Any<int>(), Arg.Any<int>()).ThrowsAsync(new ReglaNegocioException("Ya existe un recordatorio para esa misma compra (BT-0003)."));

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarAsync(CompraValida(), 6));

        await _auditoria.DidNotReceiveWithAnyArgs().RegistrarAsync(default, default!, default!, default, default!, default);
    }

    // ---------- Recordatorio atendido ----------
    [Fact]
    public async Task Atender_sin_medio_ni_resultado_lista_los_faltantes()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.AtenderAsync(21, new AtenderBateriaDto { Resultado = "   " }, 6));

        Assert.Equal("Debe completar los campos obligatorios para registrar la atención.", ex.Message);
        Assert.Equivalent(new[] { "Medio de contacto", "Resultado" }, ex.Errores);
    }

    [Fact]
    public async Task Atender_con_medio_invalido_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.AtenderAsync(21, new AtenderBateriaDto { Medio = "Paloma", Resultado = "ok" }, 6));

        Assert.Equal("El medio de contacto indicado no es válido.", ex.Message);
    }

    [Fact]
    public async Task Atender_con_textos_demasiado_largos_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.AtenderAsync(21, new AtenderBateriaDto { Medio = "Llamada", Resultado = new string('r', 501) }, 6));
        Assert.Equal("El resultado no puede superar los 500 caracteres.", ex.Message);

        ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.AtenderAsync(21, new AtenderBateriaDto { Medio = "Llamada", Resultado = "ok", Observacion = new string('o', 1001) }, 6));
        Assert.Equal("La observación no puede superar los 1000 caracteres.", ex.Message);

        ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.AtenderAsync(21, new AtenderBateriaDto { Medio = "Llamada", Resultado = "ok", ProximoPaso = new string('p', 501) }, 6));
        Assert.Equal("El próximo paso no puede superar los 500 caracteres.", ex.Message);
    }

    [Fact]
    public async Task Atender_recordatorio_inexistente_se_rechaza()
    {
        _da.ObtenerAsync(99).Returns((RecordatorioBateriaDto?)null);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.AtenderAsync(99, new AtenderBateriaDto { Medio = "Llamada", Resultado = "ok" }, 6));

        Assert.Equal("El recordatorio indicado no existe.", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().AtenderAsync(default, default!, default!, default, default, default);
    }

    [Fact]
    public async Task Atender_camino_feliz_registra_audita_y_devuelve_el_recordatorio_atendido()
    {
        _da.AtenderAsync(21, "Llamada", "Cliente interesado", "Pidió cotización", "Enviar cotización", 6).Returns(true);
        _da.ObtenerAsync(21).Returns(Recordatorio(21, "Atendido"));

        var resultado = await _flujo.AtenderAsync(21,
            new AtenderBateriaDto { Medio = " Llamada ", Resultado = " Cliente interesado ", Observacion = " Pidió cotización ", ProximoPaso = " Enviar cotización " }, 6);

        Assert.True(resultado.Aplicado);
        Assert.Equal("Atendido", resultado.Recordatorio.Estado);
        Assert.Contains("Atendido", resultado.Mensaje);
        await _auditoria.Received(1).RegistrarAsync(6, "CRM", "RecordatorioBateria", 21, "BATERIA_ATENDIDA",
            Arg.Is<string>(d => d.Contains("Cliente interesado") && d.Contains("Pidió cotización") && d.Contains("Enviar cotización")));
    }

    [Theory]
    [InlineData("Atendido")]
    [InlineData("Cerrado")]
    public async Task Atender_un_recordatorio_ya_finalizado_devuelve_el_estado_actual_sin_duplicar(string estado)
    {
        _da.AtenderAsync(21, Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<int>()).Returns(false);
        _da.ObtenerAsync(21).Returns(Recordatorio(21, estado));

        var resultado = await _flujo.AtenderAsync(21, new AtenderBateriaDto { Medio = "Correo", Resultado = "otro intento" }, 6);

        Assert.False(resultado.Aplicado);
        Assert.Equal(estado, resultado.Recordatorio.Estado);
        Assert.Contains($"ya estaba {estado}", resultado.Mensaje);
        await _auditoria.DidNotReceiveWithAnyArgs().RegistrarAsync(default, default!, default!, default, default!, default);
    }

    // ---------- Listado ----------
    [Fact]
    public async Task Listar_con_estado_invalido_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ListarAsync("Inventado", null, null, null, null));

        Assert.Equal("El estado indicado no es válido.", ex.Message);
    }

    [Fact]
    public async Task Listar_con_rango_invertido_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.ListarAsync(null, null, null, new DateTime(2026, 12, 1), new DateTime(2026, 11, 1)));

        Assert.Equal("La fecha inicial no puede ser posterior a la fecha final.", ex.Message);
    }

    [Fact]
    public async Task Listar_normaliza_los_filtros_antes_de_consultar()
    {
        await _flujo.ListarAsync("  Pendiente ", 6, "  bomberos ", new DateTime(2026, 11, 1, 13, 0, 0), new DateTime(2026, 11, 30));

        await _da.Received(1).ListarAsync("Pendiente", 6, "bomberos", new DateTime(2026, 11, 1), new DateTime(2026, 11, 30));
    }

    [Fact]
    public async Task Listar_con_filtros_vacios_consulta_todo()
    {
        await _flujo.ListarAsync("", null, "   ", null, null);

        await _da.Received(1).ListarAsync(null, null, null, null, null);
    }

    [Fact]
    public async Task Obtener_recordatorio_inexistente_se_rechaza()
    {
        _da.ObtenerAsync(99).Returns((RecordatorioBateriaDto?)null);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ObtenerAsync(99));

        Assert.Equal("El recordatorio indicado no existe.", ex.Message);
    }

    // ---------- Integración con facturación ----------
    [Fact]
    public async Task RegistrarDesdeFactura_audita_solo_los_recordatorios_creados()
    {
        _da.RegistrarDesdeFacturaAsync(5, 6).Returns(new List<BateriaFacturaResultadoDto>
        {
            new() { IdFactura = 5, NumeroFactura = "F-5", ModeloBateria = "A", Cantidad = 2, IdRecordatorio = 31, Resultado = "Creado" },
            new() { IdFactura = 5, NumeroFactura = "F-5", ModeloBateria = "B", Cantidad = 1, IdRecordatorio = 32, Resultado = "Existente" },
            new() { IdFactura = 5, NumeroFactura = "F-5", ModeloBateria = "C", Cantidad = 1, Resultado = "Omitido", Motivo = "x" }
        });

        var resultados = await _flujo.RegistrarDesdeFacturaAsync(5, 6);

        Assert.Equal(3, resultados.Count);
        await _auditoria.Received(1).RegistrarAsync(6, "CRM", "RecordatorioBateria", 31, "BATERIA_REGISTRADA", Arg.Is<string>(d => d.Contains("F-5")));
        await _auditoria.ReceivedWithAnyArgs(1).RegistrarAsync(default, default!, default!, default, default!, default);
    }

    // ---------- Servicio de recordatorios ----------
    [Fact]
    public async Task Procesar_manual_devuelve_el_resumen_y_audita_al_usuario()
    {
        _da.ProcesarAsync().Returns(new ResumenProcesoRecordatoriosDto { AlertasSeguimiento = 2, BateriasNotificadas = 1 });

        var resumen = await _flujo.ProcesarAsync(1);

        Assert.Equal(2, resumen.AlertasSeguimiento);
        await _auditoria.Received(1).RegistrarAsync(1, "CRM", "RecordatoriosCrm", null, "RECORDATORIOS_PROCESADOS", Arg.Any<string>());
    }

    [Fact]
    public async Task Procesar_automatico_no_audita()
    {
        _da.ProcesarAsync().Returns(new ResumenProcesoRecordatoriosDto());

        await _flujo.ProcesarAsync();

        await _auditoria.DidNotReceiveWithAnyArgs().RegistrarAsync(default, default!, default!, default, default!, default);
    }

    [Fact]
    public void El_resumen_del_proceso_se_explica_en_texto()
    {
        Assert.Equal("No había nada pendiente por avisar.", new ResumenProcesoRecordatoriosDto().Mensaje);

        var con = new ResumenProcesoRecordatoriosDto { SeguimientosAtrasados = 1, AlertasSeguimiento = 2, SeriesExtendidas = 1, OcurrenciasCreadas = 6, BateriasNotificadas = 3, Errores = 1 };
        Assert.True(con.HuboCambios);
        Assert.Contains("3 aviso(s) de batería", con.Mensaje);
        Assert.Contains("1 error(es)", con.Mensaje);
    }

    [Fact]
    public void El_recordatorio_calcula_codigo_abierto_y_reemplazos()
    {
        var r = Recordatorio(7);
        r.IdsReemplazados = "3,5";

        Assert.Equal("BT-0007", r.Codigo);
        Assert.True(r.Abierto);
        Assert.Equal(new[] { 3, 5 }, r.Reemplaza);
        Assert.False(Recordatorio(8, "Atendido").Abierto);
        Assert.Empty(Recordatorio(9).Reemplaza);
    }

    // ---------- Servicio en segundo plano ----------
    [Theory]
    [InlineData(null, 5)]
    [InlineData(0, 1)]
    [InlineData(-4, 1)]
    [InlineData(1, 1)]
    [InlineData(15, 15)]
    public void El_servicio_usa_el_intervalo_configurado_con_minimo_de_un_minuto(int? minutos, int esperado)
    {
        Assert.Equal(TimeSpan.FromMinutes(esperado), RecordatoriosCrmHostedService.CalcularIntervalo(minutos));
    }

    private static RecordatoriosCrmHostedService Servicio(ICrmRecordatoriosFlujo flujo, string? minutos = null)
    {
        var servicios = new ServiceCollection().AddScoped(_ => flujo).BuildServiceProvider();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(minutos is null ? new Dictionary<string, string?>() : new Dictionary<string, string?> { ["Crm:IntervaloMinutosRecordatorios"] = minutos })
            .Build();
        return new RecordatoriosCrmHostedService(servicios.GetRequiredService<IServiceScopeFactory>(), config, NullLogger<RecordatoriosCrmHostedService>.Instance);
    }

    [Fact]
    public void El_servicio_lee_el_intervalo_de_la_configuracion()
    {
        Assert.Equal(TimeSpan.FromMinutes(5), Servicio(Substitute.For<ICrmRecordatoriosFlujo>()).Intervalo);
        Assert.Equal(TimeSpan.FromMinutes(1), Servicio(Substitute.For<ICrmRecordatoriosFlujo>(), "1").Intervalo);
        Assert.Equal(TimeSpan.FromMinutes(30), Servicio(Substitute.For<ICrmRecordatoriosFlujo>(), "30").Intervalo);
    }

    [Fact]
    public async Task Una_vuelta_del_servicio_ejecuta_el_proceso_una_vez()
    {
        var flujo = Substitute.For<ICrmRecordatoriosFlujo>();
        flujo.ProcesarAsync(Arg.Any<int?>()).Returns(new ResumenProcesoRecordatoriosDto { BateriasNotificadas = 1 });

        await Servicio(flujo).EjecutarVueltaAsync();

        await flujo.Received(1).ProcesarAsync(null);
    }

    [Fact]
    public async Task Una_vuelta_con_error_no_detiene_el_servicio()
    {
        var flujo = Substitute.For<ICrmRecordatoriosFlujo>();
        flujo.ProcesarAsync(Arg.Any<int?>()).ThrowsAsync(new InvalidOperationException("base de datos caída"));

        var servicio = Servicio(flujo);
        await servicio.EjecutarVueltaAsync();   // no lanza
        await servicio.EjecutarVueltaAsync();   // y puede volver a intentar

        await flujo.Received(2).ProcesarAsync(null);
    }

    [Fact]
    public async Task El_servicio_respeta_la_cancelacion_durante_la_espera_inicial()
    {
        var flujo = Substitute.For<ICrmRecordatoriosFlujo>();
        var servicio = Servicio(flujo);
        using var cancelar = new CancellationTokenSource();

        await servicio.StartAsync(cancelar.Token);
        await cancelar.CancelAsync();
        await servicio.StopAsync(CancellationToken.None);

        await flujo.DidNotReceiveWithAnyArgs().ProcesarAsync();
    }
}
