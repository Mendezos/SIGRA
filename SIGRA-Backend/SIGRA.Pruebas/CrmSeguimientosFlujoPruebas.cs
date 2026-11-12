using NSubstitute;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Flujo.Flujos;

namespace SIGRA.Pruebas;

// CRMGPSC-015 a 018 y 024: seguimientos, agenda y contactos periódicos.
public class CrmSeguimientosFlujoPruebas
{
    // Reloj fijo: miércoles 11/11/2026 18:30 en Costa Rica (UTC-6) = 12/11/2026 00:30 UTC.
    private sealed class RelojFijo(DateTimeOffset utc) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utc;
    }

    private const int Kimberly = 6;
    private const int Henry = 7;
    private const int Admin = 1;

    private readonly ICrmSeguimientosDA _da = Substitute.For<ICrmSeguimientosDA>();
    private readonly ICrmCatalogosDA _catalogos = Substitute.For<ICrmCatalogosDA>();
    private readonly IAuditoriaDA _auditoria = Substitute.For<IAuditoriaDA>();
    private readonly CrmSeguimientosFlujo _flujo;

    public CrmSeguimientosFlujoPruebas()
    {
        _flujo = new CrmSeguimientosFlujo(_da, _catalogos, _auditoria, new RelojFijo(new DateTimeOffset(2026, 11, 12, 0, 30, 0, TimeSpan.Zero)));

        _catalogos.ListarVendedoresAsync().Returns(new List<VendedorDto>
        {
            new() { IdUsuario = Kimberly, Nombre = "Kimberly Sanchez" },
            new() { IdUsuario = Henry, Nombre = "Henry Ortiz" }
        });
        _catalogos.ObtenerEmpresaAsync("Prospecto", 1).Returns(Empresa("Prospecto", 1, true));
        _catalogos.ObtenerEmpresaAsync("Prospecto", 3).Returns(Empresa("Prospecto", 3, false));
        _catalogos.ListarContactosAsync("Prospecto", 1, false).Returns(new List<CrmContactoCatalogoDto>
        {
            new() { IdContactoEmpresa = 1, Nombre = "Marta Solano", Activo = true },
            new() { IdContactoEmpresa = 2, Nombre = "Luis Rojas", Activo = false }
        });
        _da.CrearAsync(default!, default, default, default!, default, default!, default!, default, default).ReturnsForAnyArgs(10);
        _da.CrearSerieAsync(default!, default, default, default!, default, default, default!, default!, default!, default, default).ReturnsForAnyArgs(20);
    }

    private static CrmEmpresaBasicaDto Empresa(string tipo, int id, bool activa) =>
        new() { Tipo = tipo, IdEmpresa = id, Empresa = "Refinadora Costarricense", Estado = activa ? "Nuevo" : "Descartado", Activa = activa };

    private static CrmSeguimientoDto Seguimiento(string estado = "Pendiente", int responsable = Kimberly, DateTime? fechaHora = null) => new()
    {
        IdSeguimiento = 10,
        TipoEmpresa = "Prospecto",
        IdEmpresa = 1,
        Empresa = "Refinadora Costarricense",
        Tipo = "Llamada",
        FechaHora = fechaHora ?? new DateTime(2026, 11, 12, 10, 0, 0),
        FechaHoraOriginal = fechaHora ?? new DateTime(2026, 11, 12, 10, 0, 0),
        Motivo = "Presentar propuesta",
        Prioridad = "Alta",
        IdResponsable = responsable,
        Responsable = "Kimberly Sanchez",
        Estado = estado,
        Origen = "Manual"
    };

    private void SeguimientoExiste(CrmSeguimientoDto s) => _da.ObtenerAsync(s.IdSeguimiento).Returns(s);

    private static CrearSeguimientoDto Nuevo() => new()
    {
        TipoEmpresa = "Prospecto",
        IdEmpresa = 1,
        IdContactoEmpresa = 1,
        Tipo = "Llamada",
        Fecha = "2026-11-12",
        Hora = "10:00",
        Motivo = "  Presentar propuesta  ",
        Prioridad = "Alta",
        IdResponsable = Kimberly
    };

    // ---------- CRMGPSC-015: programar ----------
    [Fact]
    public async Task Crear_seguimiento_valido_lo_programa_pendiente_y_audita()
    {
        SeguimientoExiste(Seguimiento());

        var creado = await _flujo.CrearSeguimientoAsync(Nuevo(), Kimberly);

        Assert.Equal("SG-0010", creado.Codigo);
        await _da.Received(1).CrearAsync("Prospecto", 1, 1, "Llamada", new DateTime(2026, 11, 12, 10, 0, 0), "Presentar propuesta", "Alta", Kimberly, Kimberly);
        await _auditoria.Received(1).RegistrarAsync(Kimberly, "CRM", "Seguimiento", 10, "SEGUIMIENTO_CREADO", Arg.Any<string>());
    }

    [Fact]
    public async Task Crear_seguimiento_sin_campos_obligatorios_lista_los_faltantes()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.CrearSeguimientoAsync(new CrearSeguimientoDto(), Admin));

        Assert.Equal("Debe completar los campos obligatorios para programar el seguimiento.", ex.Message);
        Assert.Contains("Empresa (prospecto o cliente)", ex.Errores);
        Assert.Contains("Tipo de seguimiento", ex.Errores);
        Assert.Contains("Fecha", ex.Errores);
        Assert.Contains("Hora", ex.Errores);
        Assert.Contains("Motivo", ex.Errores);
        Assert.Contains("Responsable", ex.Errores);
        await _da.DidNotReceiveWithAnyArgs().CrearAsync(default!, default, default, default!, default, default!, default!, default, default);
    }

    [Fact]
    public async Task Crear_seguimiento_con_motivo_en_blanco_lo_trata_como_faltante()
    {
        var dto = Nuevo();
        dto.Motivo = "   ";

        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.CrearSeguimientoAsync(dto, Kimberly));

        Assert.Equal(new[] { "Motivo" }, ex.Errores);
    }

    [Fact]
    public async Task Crear_seguimiento_de_un_vendedor_sin_responsable_lo_asigna_a_el_mismo()
    {
        var dto = Nuevo();
        dto.IdResponsable = null;
        dto.Prioridad = null;
        SeguimientoExiste(Seguimiento());

        await _flujo.CrearSeguimientoAsync(dto, Henry);

        await _da.Received(1).CrearAsync("Prospecto", 1, 1, "Llamada", Arg.Any<DateTime>(), Arg.Any<string>(), "Media", Henry, Henry);
    }

    [Theory]
    [InlineData("2026-02-30", "10:00")]
    [InlineData("2026-13-01", "10:00")]
    [InlineData("12/11/2026", "10:00")]
    [InlineData("2026-11-12", "25:00")]
    [InlineData("2026-11-12", "10:61")]
    public async Task Crear_seguimiento_con_fecha_u_hora_inexistente_se_rechaza(string fecha, string hora)
    {
        var dto = Nuevo();
        dto.Fecha = fecha;
        dto.Hora = hora;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CrearSeguimientoAsync(dto, Kimberly));

        Assert.Contains("futuras", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().CrearAsync(default!, default, default, default!, default, default!, default!, default, default);
    }

    [Theory]
    [InlineData("2026-11-10", "10:00")]   // ayer
    [InlineData("2026-11-11", "18:30")]   // justo ahora: ya pasó
    [InlineData("2026-11-11", "08:00")]   // hoy, horas atrás
    public async Task Crear_seguimiento_en_el_pasado_se_rechaza_y_pide_fecha_futura(string fecha, string hora)
    {
        var dto = Nuevo();
        dto.Fecha = fecha;
        dto.Hora = hora;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CrearSeguimientoAsync(dto, Kimberly));

        Assert.Contains("inserte una fecha y hora futuras", ex.Message);
    }

    [Fact]
    public async Task Crear_seguimiento_hoy_a_una_hora_futura_se_acepta()
    {
        var dto = Nuevo();
        dto.Fecha = "2026-11-11";
        dto.Hora = "18:31";
        SeguimientoExiste(Seguimiento());

        await _flujo.CrearSeguimientoAsync(dto, Kimberly);

        await _da.Received(1).CrearAsync("Prospecto", 1, 1, "Llamada", new DateTime(2026, 11, 11, 18, 31, 0), Arg.Any<string>(), "Alta", Kimberly, Kimberly);
    }

    [Fact]
    public async Task Crear_seguimiento_con_contacto_inactivo_pide_un_contacto_activo()
    {
        var dto = Nuevo();
        dto.IdContactoEmpresa = 2;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CrearSeguimientoAsync(dto, Kimberly));

        Assert.Equal("El contacto seleccionado está inactivo; elija un contacto activo.", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().CrearAsync(default!, default, default, default!, default, default!, default!, default, default);
    }

    [Fact]
    public async Task Crear_seguimiento_con_contacto_de_otra_empresa_se_rechaza()
    {
        var dto = Nuevo();
        dto.IdContactoEmpresa = 99;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CrearSeguimientoAsync(dto, Kimberly));

        Assert.Equal("El contacto seleccionado no pertenece a la empresa indicada.", ex.Message);
    }

    [Fact]
    public async Task Crear_seguimiento_con_responsable_inactivo_pide_otro_vendedor()
    {
        var dto = Nuevo();
        dto.IdResponsable = 12;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CrearSeguimientoAsync(dto, Kimberly));

        Assert.Contains("elija a otro vendedor", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().CrearAsync(default!, default, default, default!, default, default!, default!, default, default);
    }

    [Fact]
    public async Task Crear_seguimiento_para_una_empresa_inactiva_se_rechaza()
    {
        var dto = Nuevo();
        dto.IdEmpresa = 3;
        dto.IdContactoEmpresa = null;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CrearSeguimientoAsync(dto, Kimberly));

        Assert.Contains("no está activa", ex.Message);
    }

    [Fact]
    public async Task Crear_seguimiento_para_una_empresa_inexistente_se_rechaza()
    {
        var dto = Nuevo();
        dto.IdEmpresa = 999;
        dto.IdContactoEmpresa = null;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CrearSeguimientoAsync(dto, Kimberly));

        Assert.Equal("La empresa indicada no existe.", ex.Message);
    }

    [Theory]
    [InlineData("Fax", "Alta", "Empresa")]
    [InlineData("Llamada", "Urgente", "Empresa")]
    [InlineData("Llamada", "Alta", "Otra")]
    public async Task Crear_seguimiento_con_valores_fuera_de_catalogo_se_rechaza(string tipo, string prioridad, string tipoEmpresa)
    {
        var dto = Nuevo();
        dto.Tipo = tipo;
        dto.Prioridad = prioridad;
        dto.TipoEmpresa = tipoEmpresa == "Empresa" ? "Prospecto" : tipoEmpresa;

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CrearSeguimientoAsync(dto, Kimberly));
    }

    [Fact]
    public async Task Crear_seguimiento_con_motivo_de_mas_de_500_caracteres_se_rechaza()
    {
        var dto = Nuevo();
        dto.Motivo = new string('x', 501);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CrearSeguimientoAsync(dto, Kimberly));

        Assert.Contains("500", ex.Message);
    }

    // ---------- CRMGPSC-016: agenda ----------
    [Fact]
    public async Task Agenda_por_defecto_muestra_los_abiertos_del_usuario_de_hoy_a_7_dias()
    {
        _da.ListarAsync(Arg.Any<CrmSeguimientoFiltro>()).Returns(new List<CrmSeguimientoDto>());

        await _flujo.ListarAgendaAsync(new CrmAgendaConsultaDto(), Kimberly);

        await _da.Received(1).ListarAsync(Arg.Is<CrmSeguimientoFiltro>(f =>
            f.IdResponsable == Kimberly && f.Desde == new DateTime(2026, 11, 11) && f.Hasta == new DateTime(2026, 11, 18) &&
            f.SoloAbiertos && f.Estado == null));
    }

    [Fact]
    public async Task Agenda_con_filtros_los_combina_y_normaliza()
    {
        _da.ListarAsync(Arg.Any<CrmSeguimientoFiltro>()).Returns(new List<CrmSeguimientoDto>());
        var consulta = new CrmAgendaConsultaDto
        {
            IdResponsable = Henry, Desde = "2026-11-01", Hasta = "2026-11-30", Prioridad = "alta", Tipo = "visita", Estado = "pendiente", Texto = "  refinadora "
        };

        await _flujo.ListarAgendaAsync(consulta, Kimberly);

        await _da.Received(1).ListarAsync(Arg.Is<CrmSeguimientoFiltro>(f =>
            f.IdResponsable == Henry && f.Desde == new DateTime(2026, 11, 1) && f.Hasta == new DateTime(2026, 11, 30) &&
            f.Prioridad == "Alta" && f.Tipo == "Visita" && f.Estado == "Pendiente" && !f.SoloAbiertos && f.Texto == "refinadora"));
    }

    [Fact]
    public async Task Agenda_de_todos_los_responsables_no_filtra_por_usuario()
    {
        _da.ListarAsync(Arg.Any<CrmSeguimientoFiltro>()).Returns(new List<CrmSeguimientoDto>());

        await _flujo.ListarAgendaAsync(new CrmAgendaConsultaDto { TodosResponsables = true, Estado = "Todos" }, Kimberly);

        await _da.Received(1).ListarAsync(Arg.Is<CrmSeguimientoFiltro>(f => f.IdResponsable == null && !f.SoloAbiertos && f.Estado == null));
    }

    [Fact]
    public async Task Agenda_de_atrasados_o_sin_rango_no_limita_por_fechas()
    {
        _da.ListarAsync(Arg.Any<CrmSeguimientoFiltro>()).Returns(new List<CrmSeguimientoDto>());

        await _flujo.ListarAgendaAsync(new CrmAgendaConsultaDto { Estado = "Atrasado" }, Kimberly);
        await _flujo.ListarAgendaAsync(new CrmAgendaConsultaDto { SinRango = true }, Kimberly);

        await _da.Received(2).ListarAsync(Arg.Is<CrmSeguimientoFiltro>(f => f.Desde == null && f.Hasta == null));
    }

    [Theory]
    [InlineData("2026-12-10", "2026-12-01")]
    public async Task Agenda_con_rango_invertido_se_rechaza(string desde, string hasta)
    {
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ListarAgendaAsync(new CrmAgendaConsultaDto { Desde = desde, Hasta = hasta }, Kimberly));
    }

    [Theory]
    [InlineData("2026-02-30", null, null, null)]
    [InlineData(null, "no-es-fecha", null, null)]
    [InlineData(null, null, "Roto", null)]
    [InlineData(null, null, null, "Critica")]
    public async Task Agenda_con_criterios_invalidos_se_rechaza(string? desde, string? hasta, string? estado, string? prioridad)
    {
        var consulta = new CrmAgendaConsultaDto { Desde = desde, Hasta = hasta, Estado = estado, Prioridad = prioridad };

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ListarAgendaAsync(consulta, Kimberly));
        await _da.DidNotReceiveWithAnyArgs().ListarAsync(default!);
    }

    [Fact]
    public async Task Agenda_sin_resultados_devuelve_lista_vacia()
    {
        _da.ListarAsync(Arg.Any<CrmSeguimientoFiltro>()).Returns(new List<CrmSeguimientoDto>());

        var lista = await _flujo.ListarAgendaAsync(new CrmAgendaConsultaDto { Desde = "2031-01-01", Hasta = "2031-01-07" }, Kimberly);

        Assert.Empty(lista);
    }

    [Fact]
    public async Task Obtener_un_seguimiento_inexistente_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ObtenerSeguimientoAsync(999));

        Assert.Equal("El seguimiento indicado no existe.", ex.Message);
    }

    // ---------- CRMGPSC-017: reprogramar ----------
    private static ReprogramarSeguimientoDto Reprogramacion() => new() { Fecha = "2026-11-15", Hora = "09:30", Motivo = " El cliente pidió otro día " };

    [Theory]
    [InlineData("Pendiente")]
    [InlineData("Atrasado")]
    public async Task Reprogramar_un_seguimiento_abierto_actualiza_la_programacion_y_audita(string estado)
    {
        SeguimientoExiste(Seguimiento(estado));

        var resultado = await _flujo.ReprogramarAsync(10, Reprogramacion(), Kimberly, false);

        Assert.True(resultado.Aplicado);
        await _da.Received(1).ReprogramarAsync(10, new DateTime(2026, 11, 15, 9, 30, 0), "El cliente pidió otro día", Kimberly);
        await _auditoria.Received(1).RegistrarAsync(Kimberly, "CRM", "Seguimiento", 10, "SEGUIMIENTO_REPROGRAMADO",
            Arg.Is<string>(d => d.Contains("Fecha y hora") && d.Contains("12/11/2026 10:00") && d.Contains("15/11/2026 09:30")));
    }

    [Theory]
    [InlineData("2026-11-10", "10:00")]
    [InlineData("2026-11-11", "18:30")]
    [InlineData("2026-02-30", "10:00")]
    [InlineData("2026-11-15", "99:00")]
    public async Task Reprogramar_con_fecha_pasada_o_inexistente_no_cambia_nada(string fecha, string hora)
    {
        SeguimientoExiste(Seguimiento());
        var dto = Reprogramacion();
        dto.Fecha = fecha;
        dto.Hora = hora;

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ReprogramarAsync(10, dto, Kimberly, false));

        await _da.DidNotReceiveWithAnyArgs().ReprogramarAsync(default, default, default!, default);
    }

    [Theory]
    [InlineData("Completado")]
    [InlineData("Cancelado")]
    public async Task Reprogramar_un_seguimiento_cerrado_pide_crear_uno_nuevo(string estado)
    {
        SeguimientoExiste(Seguimiento(estado));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ReprogramarAsync(10, Reprogramacion(), Kimberly, false));

        Assert.Equal("El seguimiento ya está cerrado; cree un seguimiento nuevo.", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().ReprogramarAsync(default, default, default!, default);
    }

    [Fact]
    public async Task Reprogramar_sin_motivo_ni_fecha_lista_los_faltantes()
    {
        SeguimientoExiste(Seguimiento());

        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.ReprogramarAsync(10, new ReprogramarSeguimientoDto(), Kimberly, false));

        Assert.Contains("Nueva fecha", ex.Errores);
        Assert.Contains("Nueva hora", ex.Errores);
        Assert.Contains("Motivo de la reprogramación", ex.Errores);
    }

    [Fact]
    public async Task Reprogramar_un_seguimiento_ajeno_solo_lo_puede_hacer_el_administrador()
    {
        SeguimientoExiste(Seguimiento(responsable: Kimberly));

        await Assert.ThrowsAsync<AccesoDenegadoException>(() => _flujo.ReprogramarAsync(10, Reprogramacion(), Henry, false));
        await _flujo.ReprogramarAsync(10, Reprogramacion(), Admin, true);

        await _da.Received(1).ReprogramarAsync(10, Arg.Any<DateTime>(), Arg.Any<string>(), Admin);
    }

    [Fact]
    public async Task Reprogramar_un_seguimiento_inexistente_se_rechaza()
    {
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ReprogramarAsync(999, Reprogramacion(), Kimberly, false));
    }

    // ---------- CRMGPSC-018: completar ----------
    [Fact]
    public async Task Completar_registra_resultado_y_audita()
    {
        SeguimientoExiste(Seguimiento());
        _da.CompletarAsync(default, default, default!, default, default, default).ReturnsForAnyArgs(true);

        var resultado = await _flujo.CompletarAsync(10, new CompletarSeguimientoDto
        {
            FechaReal = "2026-11-11T17:00", Resultado = " Acordó reunión ", Observaciones = "Muy interesado", ProximoPaso = "Enviar cotización"
        }, Kimberly, false);

        Assert.True(resultado.Aplicado);
        await _da.Received(1).CompletarAsync(10, new DateTime(2026, 11, 11, 17, 0, 0), "Acordó reunión", "Muy interesado", "Enviar cotización", Kimberly);
        await _auditoria.Received(1).RegistrarAsync(Kimberly, "CRM", "Seguimiento", 10, "SEGUIMIENTO_COMPLETADO", Arg.Any<string>());
    }

    [Fact]
    public async Task Completar_sin_fecha_real_usa_la_hora_actual_de_Costa_Rica()
    {
        SeguimientoExiste(Seguimiento());
        _da.CompletarAsync(default, default, default!, default, default, default).ReturnsForAnyArgs(true);

        await _flujo.CompletarAsync(10, new CompletarSeguimientoDto { Resultado = "Hecho" }, Kimberly, false);

        await _da.Received(1).CompletarAsync(10, new DateTime(2026, 11, 11, 18, 30, 0), "Hecho", null, null, Kimberly);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public async Task Completar_sin_resultado_mantiene_el_estado_y_pide_el_resultado(string? resultado)
    {
        SeguimientoExiste(Seguimiento());

        var ex = await Assert.ThrowsAsync<ValidacionException>(() =>
            _flujo.CompletarAsync(10, new CompletarSeguimientoDto { Resultado = resultado, Observaciones = "algo" }, Kimberly, false));

        Assert.Contains("resultado", ex.Message);
        Assert.Contains("Resultado", ex.Errores);
        await _da.DidNotReceiveWithAnyArgs().CompletarAsync(default, default, default!, default, default, default);
    }

    [Theory]
    [InlineData("2026-11-11T18:31")]
    [InlineData("2027-01-01T10:00")]
    public async Task Completar_con_fecha_real_futura_se_rechaza(string fechaReal)
    {
        SeguimientoExiste(Seguimiento());

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.CompletarAsync(10, new CompletarSeguimientoDto { Resultado = "R", FechaReal = fechaReal }, Kimberly, false));

        Assert.Equal("La fecha real no puede ser futura.", ex.Message);
    }

    [Fact]
    public async Task Completar_con_fecha_real_invalida_o_textos_largos_se_rechaza()
    {
        SeguimientoExiste(Seguimiento());

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CompletarAsync(10, new CompletarSeguimientoDto { Resultado = "R", FechaReal = "ayer" }, Kimberly, false));
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CompletarAsync(10, new CompletarSeguimientoDto { Resultado = new string('r', 501) }, Kimberly, false));
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CompletarAsync(10, new CompletarSeguimientoDto { Resultado = "R", Observaciones = new string('o', 1001) }, Kimberly, false));
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CompletarAsync(10, new CompletarSeguimientoDto { Resultado = "R", ProximoPaso = new string('p', 501) }, Kimberly, false));
        await _da.DidNotReceiveWithAnyArgs().CompletarAsync(default, default, default!, default, default, default);
    }

    [Theory]
    [InlineData("Completado")]
    [InlineData("Cancelado")]
    public async Task Completar_un_seguimiento_ya_cerrado_no_repite_el_cierre_y_muestra_el_estado_actual(string estado)
    {
        SeguimientoExiste(Seguimiento(estado));

        var resultado = await _flujo.CompletarAsync(10, new CompletarSeguimientoDto { Resultado = "otra vez" }, Kimberly, false);

        Assert.False(resultado.Aplicado);
        Assert.Equal($"El seguimiento SG-0010 ya está {estado}; no se repite el cierre.", resultado.Mensaje);
        Assert.Equal(estado, resultado.Seguimiento.Estado);
        await _da.DidNotReceiveWithAnyArgs().CompletarAsync(default, default, default!, default, default, default);
        await _auditoria.DidNotReceiveWithAnyArgs().RegistrarAsync(default, default!, default!, default, default!, default);
    }

    [Fact]
    public async Task Completar_cuando_otro_proceso_ya_lo_cerro_devuelve_el_estado_actual_sin_auditar()
    {
        SeguimientoExiste(Seguimiento());
        _da.CompletarAsync(default, default, default!, default, default, default).ReturnsForAnyArgs(false);

        var resultado = await _flujo.CompletarAsync(10, new CompletarSeguimientoDto { Resultado = "R" }, Kimberly, false);

        Assert.False(resultado.Aplicado);
        await _auditoria.DidNotReceiveWithAnyArgs().RegistrarAsync(default, default!, default!, default, default!, default);
    }

    [Fact]
    public async Task Completar_un_seguimiento_ajeno_solo_lo_puede_hacer_el_administrador()
    {
        SeguimientoExiste(Seguimiento(responsable: Kimberly));
        _da.CompletarAsync(default, default, default!, default, default, default).ReturnsForAnyArgs(true);

        await Assert.ThrowsAsync<AccesoDenegadoException>(() => _flujo.CompletarAsync(10, new CompletarSeguimientoDto { Resultado = "R" }, Henry, false));
        var resultado = await _flujo.CompletarAsync(10, new CompletarSeguimientoDto { Resultado = "R" }, Admin, true);

        Assert.True(resultado.Aplicado);
    }

    // ---------- CRMGPSC-018: cancelar ----------
    [Fact]
    public async Task Cancelar_con_motivo_cancela_conserva_la_planificacion_y_audita()
    {
        SeguimientoExiste(Seguimiento());
        _da.CancelarAsync(default, default!, default).ReturnsForAnyArgs(true);

        var resultado = await _flujo.CancelarAsync(10, new CancelarSeguimientoDto { Motivo = " Ya no lo necesita " }, Kimberly, false);

        Assert.True(resultado.Aplicado);
        Assert.Contains("12/11/2026 10:00", resultado.Mensaje);
        await _da.Received(1).CancelarAsync(10, "Ya no lo necesita", Kimberly);
        await _auditoria.Received(1).RegistrarAsync(Kimberly, "CRM", "Seguimiento", 10, "SEGUIMIENTO_CANCELADO", Arg.Any<string>());
    }

    [Fact]
    public async Task Cancelar_sin_motivo_se_rechaza()
    {
        SeguimientoExiste(Seguimiento());

        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.CancelarAsync(10, new CancelarSeguimientoDto { Motivo = "  " }, Kimberly, false));

        Assert.Contains("motivo", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().CancelarAsync(default, default!, default);
    }

    [Fact]
    public async Task Cancelar_con_motivo_de_mas_de_500_caracteres_se_rechaza()
    {
        SeguimientoExiste(Seguimiento());

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CancelarAsync(10, new CancelarSeguimientoDto { Motivo = new string('m', 501) }, Kimberly, false));
    }

    [Fact]
    public async Task Cancelar_un_seguimiento_ya_cancelado_no_repite_el_cierre()
    {
        SeguimientoExiste(Seguimiento("Cancelado"));

        var resultado = await _flujo.CancelarAsync(10, new CancelarSeguimientoDto { Motivo = "otra vez" }, Kimberly, false);

        Assert.False(resultado.Aplicado);
        Assert.Contains("ya está Cancelado; no se repite el cierre", resultado.Mensaje);
        await _da.DidNotReceiveWithAnyArgs().CancelarAsync(default, default!, default);
    }

    [Fact]
    public async Task Cancelar_un_seguimiento_ajeno_se_deniega_salvo_al_administrador()
    {
        SeguimientoExiste(Seguimiento(responsable: Kimberly));

        await Assert.ThrowsAsync<AccesoDenegadoException>(() => _flujo.CancelarAsync(10, new CancelarSeguimientoDto { Motivo = "x" }, Henry, false));
    }

    // ---------- CRMGPSC-024: contactos periódicos ----------
    private static CrearSerieDto NuevaSerie(string periodicidad = "Mensual") => new()
    {
        TipoEmpresa = "Prospecto",
        IdEmpresa = 1,
        IdContactoEmpresa = 1,
        Periodicidad = periodicidad,
        FechaInicial = "2026-12-31",
        Hora = "09:15",
        Tipo = "Llamada",
        Motivo = " Contacto periódico ",
        Prioridad = "Media",
        IdResponsable = Kimberly
    };

    private static CrmSerieDetalleDto Serie(string estado = "Activa", int responsable = Kimberly) => new()
    {
        IdSerie = 20,
        Empresa = "Refinadora Costarricense",
        Periodicidad = "Mensual",
        Estado = estado,
        IdResponsable = responsable,
        Responsable = "Kimberly Sanchez",
        Total = 12,
        Pendientes = 12,
        MotivoCancelacion = estado == "Cancelada" ? "Ya no lo necesita" : null
    };

    [Theory]
    [InlineData("Mensual")]
    [InlineData("Trimestral")]
    [InlineData("Semestral")]
    public async Task Crear_serie_con_cada_periodicidad_la_genera_y_audita(string periodicidad)
    {
        _da.ObtenerSerieAsync(20).Returns(Serie());

        var serie = await _flujo.CrearSerieAsync(NuevaSerie(periodicidad), Kimberly);

        Assert.Equal("SC-0020", serie.Codigo);
        await _da.Received(1).CrearSerieAsync("Prospecto", 1, 1, periodicidad, new DateTime(2026, 12, 31), new TimeSpan(9, 15, 0), "Llamada", "Contacto periódico", "Media", Kimberly, Kimberly);
        await _auditoria.Received(1).RegistrarAsync(Kimberly, "CRM", "SerieContacto", 20, "SERIE_CONTACTO_CREADA", Arg.Any<string>());
    }

    [Fact]
    public async Task Crear_serie_sin_campos_obligatorios_lista_los_faltantes()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.CrearSerieAsync(new CrearSerieDto(), Admin));

        Assert.Contains("Periodicidad", ex.Errores);
        Assert.Contains("Fecha inicial", ex.Errores);
        Assert.Contains("Hora", ex.Errores);
        Assert.Contains("Motivo", ex.Errores);
        Assert.Contains("Tipo de seguimiento", ex.Errores);
        Assert.Contains("Responsable", ex.Errores);
    }

    [Theory]
    [InlineData("2026-11-10", "09:00", "anterior a la fecha actual")]
    [InlineData("2026-11-11", "09:00", "ya pasaron")]
    [InlineData("2026-11-11", "18:30", "ya pasaron")]
    [InlineData("2026-02-30", "09:00", "no es válida")]
    [InlineData("2026-13-05", "09:00", "no es válida")]
    public async Task Crear_serie_con_fecha_inicial_invalida_o_pasada_pide_corregir_la_fecha(string fecha, string hora, string fragmento)
    {
        var dto = NuevaSerie();
        dto.FechaInicial = fecha;
        dto.Hora = hora;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CrearSerieAsync(dto, Kimberly));

        Assert.Contains(fragmento, ex.Message);
        await _da.DidNotReceiveWithAnyArgs().CrearSerieAsync(default!, default, default, default!, default, default, default!, default!, default!, default, default);
    }

    [Fact]
    public async Task Crear_serie_empezando_hoy_a_una_hora_futura_se_acepta()
    {
        var dto = NuevaSerie();
        dto.FechaInicial = "2026-11-11";
        dto.Hora = "18:31";
        _da.ObtenerSerieAsync(20).Returns(Serie());

        await _flujo.CrearSerieAsync(dto, Kimberly);

        await _da.Received(1).CrearSerieAsync("Prospecto", 1, 1, "Mensual", new DateTime(2026, 11, 11), new TimeSpan(18, 31, 0), "Llamada", Arg.Any<string>(), "Media", Kimberly, Kimberly);
    }

    [Fact]
    public async Task Crear_serie_con_periodicidad_invalida_contacto_inactivo_o_responsable_inactivo_se_rechaza()
    {
        var dto = NuevaSerie("Anual");
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CrearSerieAsync(dto, Kimberly));

        dto = NuevaSerie();
        dto.IdContactoEmpresa = 2;
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CrearSerieAsync(dto, Kimberly));
        Assert.Contains("contacto activo", ex.Message);

        dto = NuevaSerie();
        dto.IdResponsable = 12;
        ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CrearSerieAsync(dto, Kimberly));
        Assert.Contains("otro vendedor", ex.Message);

        dto = NuevaSerie();
        dto.IdEmpresa = 3;
        dto.IdContactoEmpresa = null;
        ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.CrearSerieAsync(dto, Kimberly));
        Assert.Contains("no está activa", ex.Message);

        await _da.DidNotReceiveWithAnyArgs().CrearSerieAsync(default!, default, default, default!, default, default, default!, default!, default!, default, default);
    }

    [Fact]
    public async Task Cancelar_serie_con_motivo_cancela_los_futuros_y_audita()
    {
        _da.ObtenerSerieAsync(20).Returns(Serie());
        _da.CancelarSerieAsync(20, "Ya no es necesario", Kimberly).Returns((true, 3));

        var resultado = await _flujo.CancelarSerieAsync(20, new CancelarSerieDto { Motivo = " Ya no es necesario " }, Kimberly, false);

        Assert.True(resultado.Aplicado);
        Assert.Equal(3, resultado.SeguimientosCancelados);
        await _auditoria.Received(1).RegistrarAsync(Kimberly, "CRM", "SerieContacto", 20, "SERIE_CONTACTO_CANCELADA", Arg.Any<string>());
    }

    [Fact]
    public async Task Cancelar_serie_sin_motivo_se_rechaza()
    {
        _da.ObtenerSerieAsync(20).Returns(Serie());

        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.CancelarSerieAsync(20, new CancelarSerieDto { Motivo = " " }, Kimberly, false));

        Assert.Contains("motivo", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().CancelarSerieAsync(default, default!, default);
    }

    [Fact]
    public async Task Cancelar_una_serie_ya_cancelada_muestra_el_estado_actual_sin_duplicar()
    {
        _da.ObtenerSerieAsync(20).Returns(Serie("Cancelada"));

        var resultado = await _flujo.CancelarSerieAsync(20, new CancelarSerieDto { Motivo = "otra vez" }, Kimberly, false);

        Assert.False(resultado.Aplicado);
        Assert.Contains("ya está Cancelada", resultado.Mensaje);
        await _da.DidNotReceiveWithAnyArgs().CancelarSerieAsync(default, default!, default);
    }

    [Fact]
    public async Task Cancelar_una_serie_ajena_se_deniega_salvo_al_administrador()
    {
        _da.ObtenerSerieAsync(20).Returns(Serie());
        _da.CancelarSerieAsync(20, "x", Admin).Returns((true, 12));

        await Assert.ThrowsAsync<AccesoDenegadoException>(() => _flujo.CancelarSerieAsync(20, new CancelarSerieDto { Motivo = "x" }, Henry, false));
        var resultado = await _flujo.CancelarSerieAsync(20, new CancelarSerieDto { Motivo = "x" }, Admin, true);

        Assert.Equal(12, resultado.SeguimientosCancelados);
    }

    [Fact]
    public async Task Listar_series_valida_el_estado_y_normaliza_el_texto()
    {
        _da.ListarSeriesAsync(Arg.Any<int?>(), Arg.Any<string?>(), Arg.Any<string?>()).Returns(new List<CrmSerieDto>());

        await _flujo.ListarSeriesAsync(new CrmSerieFiltroDto { IdResponsable = Kimberly, Estado = "activa", Texto = " hotel " });
        await _flujo.ListarSeriesAsync(new CrmSerieFiltroDto { Estado = "Todas" });

        await _da.Received(1).ListarSeriesAsync(Kimberly, "Activa", "hotel");
        await _da.Received(1).ListarSeriesAsync(null, null, null);
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ListarSeriesAsync(new CrmSerieFiltroDto { Estado = "Rota" }));
    }

    [Fact]
    public async Task Obtener_una_serie_inexistente_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ObtenerSerieAsync(999));

        Assert.Equal("La serie indicada no existe.", ex.Message);
    }
}
