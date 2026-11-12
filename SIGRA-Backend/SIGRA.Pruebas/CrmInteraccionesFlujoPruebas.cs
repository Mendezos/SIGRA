using NSubstitute;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Flujo.Flujos;

namespace SIGRA.Pruebas;

// CRMGPSC-013 (registrar nota o interacción) y CRMGPSC-014 (historial comercial)
public class CrmInteraccionesFlujoPruebas
{
    private readonly ICrmInteraccionesDA _da = Substitute.For<ICrmInteraccionesDA>();
    private readonly ICrmCatalogosDA _catalogos = Substitute.For<ICrmCatalogosDA>();
    private readonly IAuditoriaDA _auditoria = Substitute.For<IAuditoriaDA>();
    private readonly CrmInteraccionesFlujo _flujo;

    public CrmInteraccionesFlujoPruebas()
    {
        _flujo = new CrmInteraccionesFlujo(_da, _catalogos, _auditoria);

        // Por defecto: prospecto 5 «En negociación» y cliente 2 activo, con contactos 10 (activo) y 11 (inactivo) en el prospecto.
        _catalogos.ObtenerEmpresaAsync("Prospecto", 5).Returns(Empresa("Prospecto", 5, "Hotel Los Sueños", "En negociación", true));
        _catalogos.ObtenerEmpresaAsync("Cliente", 2).Returns(Empresa("Cliente", 2, "Autobuses San José", "Activo", true));
        _catalogos.ListarContactosAsync("Prospecto", 5, false).Returns(new List<CrmContactoCatalogoDto>
        {
            new() { IdContactoEmpresa = 10, Nombre = "Laura Mora", Activo = true },
            new() { IdContactoEmpresa = 11, Nombre = "Pedro Solís", Activo = false }
        });
        _da.ListarCotizacionesAsync("Prospecto", 5).Returns(new List<CrmCotizacionEmpresaDto> { new() { IdCotizacion = 7, Monto = 1000, Estado = "Enviada" } });

        _da.RegistrarInteraccionAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<int>(), Arg.Any<string>(), Arg.Any<DateTime>(), Arg.Any<string>(),
                Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<int?>(), Arg.Any<int?>())
            .Returns(new InteraccionRegistradaDto { IdInteraccion = 12, Tipo = "Llamada", Empresa = "Hotel Los Sueños" });
        _da.RegistrarNotaAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<int>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>())
            .Returns(new NotaRegistradaDto { IdNota = 3, Empresa = "Hotel Los Sueños" });
        _da.ListarHistorialAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<int>(), Arg.Any<string?>(), Arg.Any<DateTime?>(), Arg.Any<DateTime?>(), Arg.Any<int?>())
            .Returns(new HistorialComercialDto());
    }

    // Hora actual de Costa Rica (UTC-6, sin horario de verano), como la usa el servicio.
    private static DateTime CrAhora() => DateTime.UtcNow.AddHours(-6);

    private static CrmEmpresaBasicaDto Empresa(string tipo, int id, string nombre, string estado, bool activa) =>
        new() { Tipo = tipo, IdEmpresa = id, Empresa = nombre, Estado = estado, Activa = activa };

    private static RegistrarInteraccionDto InteraccionValida() => new()
    {
        TipoEmpresa = "Prospecto",
        IdEmpresa = 5,
        IdContactoEmpresa = 10,
        Tipo = "Llamada",
        Fecha = CrAhora().AddDays(-1),
        Descripcion = "Se habló de la propuesta",
        Resultado = "Interesado",
        ProximoPaso = "Enviar cotización"
    };

    private static RegistrarNotaDto NotaValida() => new()
    {
        TipoEmpresa = "Cliente",
        IdEmpresa = 2,
        Categoria = "Comercial",
        Texto = "Prefiere que lo llamen por la mañana",
        Visibilidad = "Equipo"
    };

    // ---------- CRMGPSC-013, escenario 1: interacción registrada ----------
    [Fact]
    public async Task Catalogos_se_aceptan_sin_distinguir_tildes_ni_mayusculas()
    {
        var dto = InteraccionValida();
        dto.Tipo = "reunion";
        await _flujo.RegistrarInteraccionAsync(dto, 6);
        await _da.Received(1).RegistrarInteraccionAsync("Prospecto", 5, 6, "Reunión", Arg.Any<DateTime>(), Arg.Any<string>(),
            Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<int?>(), Arg.Any<int?>());

        await _flujo.ObtenerHistorialAsync("prospecto", 5, "interaccion", null, null, null, 6);
        await _da.Received(1).ListarHistorialAsync("Prospecto", 5, 6, "Interacción", null, null, null);
    }

    [Fact]
    public async Task RegistrarInteraccion_valida_se_guarda_con_el_usuario_autor_y_se_audita()
    {
        var dto = InteraccionValida();

        var resultado = await _flujo.RegistrarInteraccionAsync(dto, 6);

        Assert.Equal("IN-0012", resultado.Codigo);
        await _da.Received(1).RegistrarInteraccionAsync("Prospecto", 5, 6, "Llamada", dto.Fecha!.Value, "Se habló de la propuesta",
            "Interesado", "Enviar cotización", 10, null);
        await _auditoria.Received(1).RegistrarAsync(6, "CRM", "InteraccionCRM", 12, "INTERACCION_REGISTRADA", Arg.Is<string?>(d => d!.Contains("Hotel Los Sueños")));
    }

    [Fact]
    public async Task RegistrarInteraccion_normaliza_espacios_y_acepta_minusculas_en_los_catalogos()
    {
        var dto = InteraccionValida();
        dto.TipoEmpresa = " prospecto ";
        dto.Tipo = " reunión ";
        dto.Descripcion = "   Visita al taller   ";
        dto.Resultado = "   ";
        dto.ProximoPaso = null;

        await _flujo.RegistrarInteraccionAsync(dto, 6);

        await _da.Received(1).RegistrarInteraccionAsync("Prospecto", 5, 6, "Reunión", dto.Fecha!.Value, "Visita al taller", null, null, 10, null);
    }

    [Fact]
    public async Task RegistrarInteraccion_a_un_cliente_activo_sin_contacto_ni_cotizacion_es_valida()
    {
        var dto = new RegistrarInteraccionDto
        {
            TipoEmpresa = "Cliente", IdEmpresa = 2, Tipo = "Correo", Fecha = CrAhora().AddMinutes(-5), Descripcion = "Se envió el catálogo"
        };

        await _flujo.RegistrarInteraccionAsync(dto, 6);

        await _da.Received(1).RegistrarInteraccionAsync("Cliente", 2, 6, "Correo", dto.Fecha!.Value, "Se envió el catálogo", null, null, null, null);
    }

    [Fact]
    public async Task RegistrarInteraccion_con_cotizacion_de_la_misma_empresa_la_relaciona()
    {
        var dto = InteraccionValida();
        dto.IdCotizacion = 7;

        await _flujo.RegistrarInteraccionAsync(dto, 6);

        await _da.Received(1).RegistrarInteraccionAsync("Prospecto", 5, 6, "Llamada", dto.Fecha!.Value, Arg.Any<string>(), Arg.Any<string?>(), Arg.Any<string?>(), 10, 7);
    }

    // ---------- CRMGPSC-013, escenario 3: datos incompletos ----------
    [Fact]
    public async Task RegistrarInteraccion_sin_datos_obligatorios_lista_los_campos_pendientes()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarInteraccionAsync(new RegistrarInteraccionDto(), 6));

        Assert.Equal("Debe completar los campos obligatorios para registrar la interacción.", ex.Message);
        Assert.Equal(new[] { "Empresa", "Tipo de interacción", "Fecha y hora", "Descripción" }, ex.Errores);
        await _da.DidNotReceiveWithAnyArgs().RegistrarInteraccionAsync(default!, default, default, default!, default, default!, default, default, default, default);
    }

    [Theory]
    [InlineData("empresa")]
    [InlineData("tipo")]
    [InlineData("descripcion")]
    [InlineData("fecha")]
    public async Task RegistrarInteraccion_indica_solo_el_campo_que_falta(string faltante)
    {
        var dto = InteraccionValida();
        switch (faltante)
        {
            case "empresa": dto.IdEmpresa = null; break;
            case "tipo": dto.Tipo = "  "; break;
            case "descripcion": dto.Descripcion = "   "; break;
            case "fecha": dto.Fecha = null; break;
        }

        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarInteraccionAsync(dto, 6));

        Assert.Single(ex.Errores);
    }

    // ---------- CRMGPSC-013, escenario 4: fecha futura ----------
    [Fact]
    public async Task RegistrarInteraccion_con_fecha_futura_se_rechaza_y_sugiere_un_seguimiento()
    {
        var dto = InteraccionValida();
        dto.Fecha = CrAhora().AddDays(1);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarInteraccionAsync(dto, 6));

        Assert.Equal("La fecha de la interacción no puede ser futura. Si es una actividad por hacer, programe un seguimiento.", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().RegistrarInteraccionAsync(default!, default, default, default!, default, default!, default, default, default, default);
    }

    [Fact]
    public async Task RegistrarInteraccion_con_fecha_de_hoy_unas_horas_adelante_se_rechaza()
    {
        var dto = InteraccionValida();
        dto.Fecha = CrAhora().AddHours(2); // dos horas por delante de la hora actual de Costa Rica

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarInteraccionAsync(dto, 6));
    }

    [Fact]
    public async Task RegistrarInteraccion_con_el_momento_actual_de_Costa_Rica_se_acepta()
    {
        var dto = InteraccionValida();
        dto.Fecha = CrAhora().AddSeconds(-2);

        await _flujo.RegistrarInteraccionAsync(dto, 6);

        await _da.ReceivedWithAnyArgs(1).RegistrarInteraccionAsync(default!, default, default, default!, default, default!, default, default, default, default);
    }

    [Fact]
    public async Task RegistrarInteraccion_con_una_fecha_absurda_se_rechaza()
    {
        var dto = InteraccionValida();
        dto.Fecha = new DateTime(1900, 1, 1);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarInteraccionAsync(dto, 6));

        Assert.Equal("La fecha de la interacción no es válida.", ex.Message);
    }

    // ---------- Validaciones de formato y longitud ----------
    [Fact]
    public async Task RegistrarInteraccion_con_tipo_inexistente_se_rechaza()
    {
        var dto = InteraccionValida();
        dto.Tipo = "Telepatía";

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarInteraccionAsync(dto, 6));

        Assert.StartsWith("El tipo de interacción no es válido", ex.Message);
    }

    [Fact]
    public async Task RegistrarInteraccion_con_tipo_de_empresa_invalido_se_rechaza()
    {
        var dto = InteraccionValida();
        dto.TipoEmpresa = "Proveedor";

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarInteraccionAsync(dto, 6));

        Assert.Equal("El tipo de empresa debe ser Prospecto o Cliente.", ex.Message);
    }

    [Theory]
    [InlineData("descripcion", 2001, "La descripción no puede superar los 2000 caracteres.")]
    [InlineData("resultado", 501, "El resultado no puede superar los 500 caracteres.")]
    [InlineData("proximo", 501, "El próximo paso no puede superar los 500 caracteres.")]
    public async Task RegistrarInteraccion_con_textos_demasiado_largos_se_rechaza(string campo, int largo, string mensaje)
    {
        var dto = InteraccionValida();
        var texto = new string('a', largo);
        if (campo == "descripcion") dto.Descripcion = texto;
        else if (campo == "resultado") dto.Resultado = texto;
        else dto.ProximoPaso = texto;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarInteraccionAsync(dto, 6));

        Assert.Equal(mensaje, ex.Message);
    }

    [Fact]
    public async Task RegistrarInteraccion_con_descripcion_de_2000_caracteres_exactos_se_acepta()
    {
        var dto = InteraccionValida();
        dto.Descripcion = new string('a', 2000);

        await _flujo.RegistrarInteraccionAsync(dto, 6);

        await _da.ReceivedWithAnyArgs(1).RegistrarInteraccionAsync(default!, default, default, default!, default, default!, default, default, default, default);
    }

    // ---------- Empresa válida ----------
    [Fact]
    public async Task RegistrarInteraccion_en_empresa_inexistente_se_rechaza()
    {
        var dto = InteraccionValida();
        dto.IdEmpresa = 999;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarInteraccionAsync(dto, 6));

        Assert.Equal("La empresa indicada no existe.", ex.Message);
    }

    [Fact]
    public async Task RegistrarInteraccion_en_prospecto_descartado_pide_reactivarlo()
    {
        _catalogos.ObtenerEmpresaAsync("Prospecto", 5).Returns(Empresa("Prospecto", 5, "Hotel Los Sueños", "Descartado", false));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarInteraccionAsync(InteraccionValida(), 6));

        Assert.Equal("No se pueden registrar interacciones en un prospecto descartado; reactívelo primero.", ex.Message);
    }

    [Fact]
    public async Task RegistrarInteraccion_en_prospecto_convertido_pide_registrarla_en_el_cliente()
    {
        _catalogos.ObtenerEmpresaAsync("Prospecto", 5).Returns(Empresa("Prospecto", 5, "Hotel Los Sueños", "Convertido", false));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarInteraccionAsync(InteraccionValida(), 6));

        Assert.Equal("No se pueden registrar interacciones en un prospecto convertido; regístrela en el cliente.", ex.Message);
    }

    [Fact]
    public async Task RegistrarInteraccion_en_cliente_inactivo_se_rechaza()
    {
        _catalogos.ObtenerEmpresaAsync("Cliente", 2).Returns(Empresa("Cliente", 2, "Autobuses San José", "Inactivo", false));
        var dto = new RegistrarInteraccionDto { TipoEmpresa = "Cliente", IdEmpresa = 2, Tipo = "Llamada", Fecha = CrAhora().AddHours(-1), Descripcion = "x" };

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarInteraccionAsync(dto, 6));

        Assert.Equal("El cliente está inactivo.", ex.Message);
    }

    // ---------- Contacto y cotización ----------
    [Fact]
    public async Task RegistrarInteraccion_con_contacto_de_otra_empresa_se_rechaza()
    {
        var dto = InteraccionValida();
        dto.IdContactoEmpresa = 99;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarInteraccionAsync(dto, 6));

        Assert.Equal("El contacto seleccionado no pertenece a la empresa.", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().RegistrarInteraccionAsync(default!, default, default, default!, default, default!, default, default, default, default);
    }

    [Fact]
    public async Task RegistrarInteraccion_con_contacto_inactivo_se_rechaza()
    {
        var dto = InteraccionValida();
        dto.IdContactoEmpresa = 11;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarInteraccionAsync(dto, 6));

        Assert.Equal("El contacto seleccionado está inactivo; elija un contacto activo.", ex.Message);
    }

    [Fact]
    public async Task RegistrarInteraccion_con_cotizacion_de_otra_empresa_se_rechaza()
    {
        var dto = InteraccionValida();
        dto.IdCotizacion = 55;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarInteraccionAsync(dto, 6));

        Assert.Equal("La cotización seleccionada no pertenece a la empresa.", ex.Message);
    }

    // ---------- CRMGPSC-013, escenario 2: nota registrada ----------
    [Fact]
    public async Task RegistrarNota_valida_se_guarda_con_su_visibilidad_y_se_audita()
    {
        var resultado = await _flujo.RegistrarNotaAsync(NotaValida(), 6);

        Assert.Equal("NT-0003", resultado.Codigo);
        await _da.Received(1).RegistrarNotaAsync("Cliente", 2, 6, "Comercial", "Prefiere que lo llamen por la mañana", "Equipo");
        await _auditoria.Received(1).RegistrarAsync(6, "CRM", "NotaCRM", 3, "NOTA_REGISTRADA", Arg.Any<string?>());
    }

    [Fact]
    public async Task RegistrarNota_sin_visibilidad_queda_para_el_equipo()
    {
        var dto = NotaValida();
        dto.Visibilidad = null;

        await _flujo.RegistrarNotaAsync(dto, 6);

        await _da.Received(1).RegistrarNotaAsync("Cliente", 2, 6, "Comercial", Arg.Any<string>(), "Equipo");
    }

    [Theory]
    [InlineData("privada", "Privada")]
    [InlineData("GENERAL", "General")]
    [InlineData(" equipo ", "Equipo")]
    public async Task RegistrarNota_normaliza_la_visibilidad(string entrada, string esperada)
    {
        var dto = NotaValida();
        dto.Visibilidad = entrada;

        await _flujo.RegistrarNotaAsync(dto, 6);

        await _da.Received(1).RegistrarNotaAsync("Cliente", 2, 6, "Comercial", Arg.Any<string>(), esperada);
    }

    [Fact]
    public async Task RegistrarNota_con_visibilidad_invalida_se_rechaza()
    {
        var dto = NotaValida();
        dto.Visibilidad = "Secreta";

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarNotaAsync(dto, 6));

        Assert.Equal("La visibilidad de la nota debe ser Privada, Equipo o General.", ex.Message);
    }

    // ---------- CRMGPSC-013, escenario 3 (notas) ----------
    [Fact]
    public async Task RegistrarNota_sin_datos_obligatorios_lista_empresa_categoria_y_texto()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarNotaAsync(new RegistrarNotaDto(), 6));

        Assert.Equal("Debe completar los campos obligatorios para registrar la nota.", ex.Message);
        Assert.Equal(new[] { "Empresa", "Categoría", "Texto de la nota" }, ex.Errores);
        await _da.DidNotReceiveWithAnyArgs().RegistrarNotaAsync(default!, default, default, default!, default!, default!);
    }

    [Fact]
    public async Task RegistrarNota_con_texto_solo_de_espacios_se_considera_vacio()
    {
        var dto = NotaValida();
        dto.Texto = "    ";

        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarNotaAsync(dto, 6));

        Assert.Equal(new[] { "Texto de la nota" }, ex.Errores);
    }

    [Fact]
    public async Task RegistrarNota_con_categoria_invalida_se_rechaza()
    {
        var dto = NotaValida();
        dto.Categoria = "Chisme";

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarNotaAsync(dto, 6));

        Assert.StartsWith("La categoría de la nota no es válida", ex.Message);
    }

    [Fact]
    public async Task RegistrarNota_con_texto_de_mas_de_2000_caracteres_se_rechaza()
    {
        var dto = NotaValida();
        dto.Texto = new string('x', 2001);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarNotaAsync(dto, 6));

        Assert.Equal("El texto de la nota no puede superar los 2000 caracteres.", ex.Message);
    }

    [Fact]
    public async Task RegistrarNota_en_prospecto_descartado_se_rechaza()
    {
        _catalogos.ObtenerEmpresaAsync("Prospecto", 5).Returns(Empresa("Prospecto", 5, "Hotel Los Sueños", "Descartado", false));
        var dto = NotaValida();
        dto.TipoEmpresa = "Prospecto";
        dto.IdEmpresa = 5;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarNotaAsync(dto, 6));

        Assert.Equal("No se pueden registrar notas en un prospecto descartado; reactívelo primero.", ex.Message);
    }

    [Fact]
    public async Task RegistrarNota_en_cliente_inactivo_se_rechaza()
    {
        _catalogos.ObtenerEmpresaAsync("Cliente", 2).Returns(Empresa("Cliente", 2, "Autobuses San José", "Inactivo", false));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarNotaAsync(NotaValida(), 6));

        Assert.Equal("El cliente está inactivo.", ex.Message);
    }

    // ---------- CRMGPSC-014: historial ----------
    [Fact]
    public async Task Historial_devuelve_la_empresa_los_movimientos_y_pasa_al_usuario_que_consulta()
    {
        _da.ListarHistorialAsync("Prospecto", 5, 6, null, null, null, null).Returns(new HistorialComercialDto
        {
            TotalSinFiltros = 2,
            Movimientos = new List<HistorialMovimientoDto> { new() { TipoMovimiento = "Nota", IdMovimiento = 1 }, new() { TipoMovimiento = "Interacción", IdMovimiento = 4 } }
        });

        var historial = await _flujo.ObtenerHistorialAsync("Prospecto", 5, null, null, null, null, 6);

        Assert.Equal("Hotel Los Sueños", historial.Empresa);
        Assert.Equal("En negociación", historial.Estado);
        Assert.True(historial.Activa);
        Assert.Equal(2, historial.Movimientos.Count);
        Assert.Equal("NT-0001", historial.Movimientos[0].Codigo);
        Assert.Equal("IN-0004", historial.Movimientos[1].Codigo);
    }

    [Fact]
    public async Task Historial_de_una_empresa_descartada_se_puede_consultar()
    {
        _catalogos.ObtenerEmpresaAsync("Prospecto", 5).Returns(Empresa("Prospecto", 5, "Hotel Los Sueños", "Descartado", false));

        var historial = await _flujo.ObtenerHistorialAsync("Prospecto", 5, null, null, null, null, 6);

        Assert.False(historial.Activa);
        Assert.Equal("Descartado", historial.Estado);
    }

    [Fact]
    public async Task Historial_sin_movimientos_informa_total_cero()
    {
        var historial = await _flujo.ObtenerHistorialAsync("Cliente", 2, null, null, null, null, 6);

        Assert.Equal(0, historial.TotalSinFiltros);
        Assert.Empty(historial.Movimientos);
        Assert.Equal("La empresa no tiene actividad comercial registrada", CrmInteraccionesFlujo.MensajeSinActividad);
    }

    [Fact]
    public async Task Historial_pasa_los_filtros_de_tipo_fechas_y_autor()
    {
        var desde = new DateTime(2026, 11, 1);
        var hasta = new DateTime(2026, 11, 30, 18, 0, 0);

        await _flujo.ObtenerHistorialAsync("Prospecto", 5, " llamada ", desde, hasta, 6, 6);

        await _da.Received(1).ListarHistorialAsync("Prospecto", 5, 6, "Llamada", desde, hasta, 6);
    }

    [Theory]
    [InlineData("interacción", "Interacción")]
    [InlineData("NOTA", "Nota")]
    [InlineData("cotización", "Cotización")]
    [InlineData("whatsapp", "WhatsApp")]
    public async Task Historial_acepta_los_tipos_de_movimiento_sin_importar_mayusculas(string entrada, string esperado)
    {
        await _flujo.ObtenerHistorialAsync("Prospecto", 5, entrada, null, null, null, 6);

        await _da.Received(1).ListarHistorialAsync("Prospecto", 5, 6, esperado, null, null, null);
    }

    [Fact]
    public async Task Historial_con_tipo_de_movimiento_desconocido_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ObtenerHistorialAsync("Prospecto", 5, "Visitas fantasma", null, null, null, 6));

        Assert.Equal("El tipo de movimiento indicado no es válido.", ex.Message);
    }

    [Fact]
    public async Task Historial_con_fecha_inicial_posterior_a_la_final_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.ObtenerHistorialAsync("Prospecto", 5, null, new DateTime(2026, 11, 10), new DateTime(2026, 11, 9), null, 6));

        Assert.Equal("La fecha inicial no puede ser posterior a la final", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().ListarHistorialAsync(default!, default, default, default, default, default, default);
    }

    [Fact]
    public async Task Historial_con_el_mismo_dia_como_inicio_y_fin_es_valido()
    {
        await _flujo.ObtenerHistorialAsync("Prospecto", 5, null, new DateTime(2026, 11, 10, 15, 0, 0), new DateTime(2026, 11, 10, 8, 0, 0), null, 6);

        await _da.ReceivedWithAnyArgs(1).ListarHistorialAsync(default!, default, default, default, default, default, default);
    }

    [Fact]
    public async Task Historial_sin_empresa_pide_seleccionarla()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.ObtenerHistorialAsync(null, null, null, null, null, null, 6));

        Assert.Equal(new[] { "Empresa" }, ex.Errores);
    }

    [Fact]
    public async Task Historial_de_empresa_inexistente_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ObtenerHistorialAsync("Cliente", 404, null, null, null, null, 6));

        Assert.Equal("La empresa indicada no existe.", ex.Message);
    }

    [Fact]
    public async Task Cotizaciones_de_empresa_inexistente_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ListarCotizacionesAsync("Cliente", 404));

        Assert.Equal("La empresa indicada no existe.", ex.Message);
    }

    [Fact]
    public async Task Cotizaciones_de_la_empresa_se_listan_con_su_codigo()
    {
        var lista = await _flujo.ListarCotizacionesAsync("Prospecto", 5);

        Assert.Equal("COT-0007", Assert.Single(lista).Codigo);
    }
}
