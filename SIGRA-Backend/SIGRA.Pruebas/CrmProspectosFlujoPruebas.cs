using NSubstitute;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Flujo.Flujos;

namespace SIGRA.Pruebas;

// CRMGPSC-001 a 007: prospectos y contactos de empresa
public class CrmProspectosFlujoPruebas
{
    // Reloj fijo: 12 de noviembre de 2026, 12:00 del mediodía en Costa Rica (18:00 UTC).
    private sealed class RelojFijo(DateTimeOffset ahora) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => ahora;
    }

    private readonly ICrmProspectosDA _da = Substitute.For<ICrmProspectosDA>();
    private readonly ICrmCatalogosDA _catalogos = Substitute.For<ICrmCatalogosDA>();
    private readonly IAuditoriaDA _auditoria = Substitute.For<IAuditoriaDA>();
    private readonly CrmProspectosFlujo _flujo;

    public CrmProspectosFlujoPruebas()
    {
        _flujo = new CrmProspectosFlujo(_da, _catalogos, _auditoria, new RelojFijo(new DateTimeOffset(2026, 11, 12, 18, 0, 0, TimeSpan.Zero)));

        _catalogos.ListarVendedoresAsync().Returns(new List<VendedorDto> { new() { IdUsuario = 6, Nombre = "Kimberly Sanchez" }, new() { IdUsuario = 7, Nombre = "Henry Ortiz" } });
        _da.BuscarCoincidenciasAsync(default, default, default, default).ReturnsForAnyArgs(new List<CoincidenciaProspectoDto>());
        _da.BuscarCoincidenciasContactoAsync(default!, default, default, default, default).ReturnsForAnyArgs(new List<CoincidenciaContactoDto>());
        _da.ListarContactosAsync(default, default, default, default).ReturnsForAnyArgs(new List<ContactoEmpresaDto>());
    }

    // ---------- datos de apoyo ----------
    private static RegistrarProspectoDto Registro(Action<RegistrarProspectoDto>? ajustar = null)
    {
        var dto = new RegistrarProspectoDto
        {
            Empresa = "Transportes del Sur", Sector = "Transporte", Direccion = "Pérez Zeledón", Telefono = "2771-0000", Correo = "info@transportessur.example",
            TamanoFlota = 20, Fuente = "Referido", IdVendedor = 6
        };
        ajustar?.Invoke(dto);
        return dto;
    }

    private static EditarProspectoDto Edicion(Action<EditarProspectoDto>? ajustar = null)
    {
        var dto = new EditarProspectoDto
        {
            Empresa = "Transportes del Sur", Sector = "Transporte", Direccion = "Pérez Zeledón", Telefono = "2771-0000", Correo = "info@transportessur.example",
            TamanoFlota = 20, Fuente = "Referido"
        };
        ajustar?.Invoke(dto);
        return dto;
    }

    private static ProspectoDto Prospecto(string estado = "Nuevo", Action<ProspectoDto>? ajustar = null)
    {
        var p = new ProspectoDto
        {
            IdProspecto = 5, Empresa = "Transportes del Sur", Sector = "Transporte", Direccion = "Pérez Zeledón", Telefono = "2771-0000",
            Correo = "info@transportessur.example", TamanoFlota = 20, Fuente = "Referido", Estado = estado, IdVendedor = 6, Vendedor = "Kimberly Sanchez",
            VendedorActivo = true, FechaIngreso = new DateTime(2026, 11, 12)
        };
        ajustar?.Invoke(p);
        return p;
    }

    private void ProspectoRegistrado(int id = 5) => _da.ObtenerProspectoAsync(id).Returns(Prospecto());

    private static ProspectoAnteriorDto Anterior(Action<ProspectoAnteriorDto>? ajustar = null)
    {
        var a = new ProspectoAnteriorDto
        {
            Empresa = "Transportes del Sur", Sector = "Transporte", Direccion = "Pérez Zeledón", Telefono = "2771-0000", Correo = "info@transportessur.example",
            TamanoFlota = 20, Fuente = "Referido", IdVendedor = 6, Vendedor = "Kimberly Sanchez"
        };
        ajustar?.Invoke(a);
        return a;
    }

    // ====================================================================================================================
    // CRMGPSC-001 Registrar prospectos
    // ====================================================================================================================
    [Fact]
    public async Task Registrar_correctamente_crea_el_prospecto_Nuevo_y_deja_auditoria()
    {
        _da.InsertarProspectoAsync(default!, default, default, default, default, default, default, default, default, default, default, default).ReturnsForAnyArgs(5);
        ProspectoRegistrado();

        var r = await _flujo.RegistrarProspectoAsync(Registro(), 6);

        Assert.False(r.RequiereConfirmacion);
        Assert.Equal(5, r.Prospecto!.IdProspecto);
        Assert.Equal("Nuevo", r.Prospecto.Estado);
        Assert.Contains("PR-0005", r.Mensaje);
        await _da.Received(1).InsertarProspectoAsync("Transportes del Sur", null, "info@transportessur.example", "2771-0000", "Transporte", "Pérez Zeledón", 20, "Referido", 6, false, null, 6);
        await _auditoria.Received(1).RegistrarAsync(6, "CRM", "Prospecto", 5, "PROSPECTO_REGISTRADO", Arg.Any<string?>());
    }

    [Fact]
    public async Task Registrar_normaliza_los_espacios_del_nombre_de_la_empresa()
    {
        _da.InsertarProspectoAsync(default!, default, default, default, default, default, default, default, default, default, default, default).ReturnsForAnyArgs(5);
        ProspectoRegistrado();

        await _flujo.RegistrarProspectoAsync(Registro(d => d.Empresa = "   Transportes    del   Sur  "), 6);

        await _da.Received(1).InsertarProspectoAsync("Transportes del Sur", Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>(),
            Arg.Any<int?>(), Arg.Any<string?>(), Arg.Any<int>(), Arg.Any<bool>(), Arg.Any<string?>(), Arg.Any<int>());
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("", "   ")]
    public async Task Registrar_sin_correo_ni_telefono_pide_al_menos_un_medio_de_contacto(string? telefono, string? correo)
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarProspectoAsync(Registro(d => { d.Telefono = telefono; d.Correo = correo; }), 6));

        Assert.Equal("Debe ingresar al menos un medio de contacto: teléfono o correo electrónico.", ex.Message);
        Assert.Contains("Teléfono", ex.Errores);
        Assert.Contains("Correo electrónico", ex.Errores);
        await _da.DidNotReceiveWithAnyArgs().InsertarProspectoAsync(default!, default, default, default, default, default, default, default, default, default, default, default);
    }

    [Fact]
    public async Task Registrar_sin_campos_obligatorios_lista_los_faltantes()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarProspectoAsync(new RegistrarProspectoDto(), 6));

        Assert.Equal("Debe completar los campos obligatorios del prospecto.", ex.Message);
        Assert.Contains("Empresa", ex.Errores);
        Assert.Contains("Sector", ex.Errores);
        Assert.Contains("Fuente del contacto", ex.Errores);
        Assert.Contains("Vendedor responsable", ex.Errores);
    }

    [Fact]
    public async Task Registrar_con_formatos_invalidos_indica_todos_los_campos_a_corregir()
    {
        var dto = Registro(d => { d.Correo = "correo-malo"; d.Telefono = "abc"; d.TamanoFlota = -2; });

        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarProspectoAsync(dto, 6));

        Assert.Equal("Hay campos con formato inválido. Corrija los campos indicados.", ex.Message);
        Assert.Contains(ex.Errores, e => e.StartsWith("Correo electrónico"));
        Assert.Contains(ex.Errores, e => e.StartsWith("Teléfono"));
        Assert.Contains(ex.Errores, e => e.StartsWith("Tamaño estimado de la flota"));
        await _da.DidNotReceiveWithAnyArgs().InsertarProspectoAsync(default!, default, default, default, default, default, default, default, default, default, default, default);
    }

    [Theory]
    [InlineData(12.5)]
    [InlineData(-1)]
    [InlineData(2000000)]
    public async Task Registrar_con_flota_que_no_es_entero_valido_se_rechaza(double flota)
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarProspectoAsync(Registro(d => d.TamanoFlota = (decimal)flota), 6));

        Assert.Contains(ex.Errores, e => e.StartsWith("Tamaño estimado de la flota"));
    }

    [Fact]
    public async Task Registrar_con_la_flota_en_cero_es_valido()
    {
        _da.InsertarProspectoAsync(default!, default, default, default, default, default, default, default, default, default, default, default).ReturnsForAnyArgs(5);
        ProspectoRegistrado();

        var r = await _flujo.RegistrarProspectoAsync(Registro(d => d.TamanoFlota = 0), 6);

        Assert.NotNull(r.Prospecto);
    }

    [Theory]
    [InlineData("Otro estado")]
    [InlineData("Descartado")]
    public async Task Registrar_con_un_estado_distinto_de_Nuevo_se_rechaza(string estado)
    {
        await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarProspectoAsync(Registro(d => d.Estado = estado), 6));
    }

    [Fact]
    public async Task Registrar_con_vendedor_inactivo_no_crea_y_pide_uno_activo()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarProspectoAsync(Registro(d => d.IdVendedor = 9), 6));

        Assert.Contains("inactivo", ex.Message);
        Assert.Contains("vendedor activo", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().InsertarProspectoAsync(default!, default, default, default, default, default, default, default, default, default, default, default);
    }

    [Fact]
    public async Task Registrar_con_coincidencias_muestra_las_coincidencias_sin_crear()
    {
        _da.BuscarCoincidenciasAsync("Transportes del Sur", "info@transportessur.example", "2771-0000", null).Returns(new List<CoincidenciaProspectoDto>
        {
            new() { Tipo = "Prospecto", IdEmpresa = 2, Empresa = "Transportes del Sur", MotivoCoincidencia = "mismo correo, mismo nombre de empresa", Estado = "Nuevo" }
        });

        var r = await _flujo.RegistrarProspectoAsync(Registro(), 6);

        Assert.True(r.RequiereConfirmacion);
        Assert.Single(r.Coincidencias);
        Assert.Null(r.Prospecto);
        await _da.DidNotReceiveWithAnyArgs().InsertarProspectoAsync(default!, default, default, default, default, default, default, default, default, default, default, default);
    }

    [Fact]
    public async Task Registrar_confirmando_el_duplicado_exige_la_justificacion()
    {
        _da.BuscarCoincidenciasAsync(default, default, default, default).ReturnsForAnyArgs(new List<CoincidenciaProspectoDto> { new() { Tipo = "Cliente", IdEmpresa = 1, Empresa = "X" } });

        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarProspectoAsync(Registro(d => { d.ConfirmarDuplicado = true; d.JustificacionDuplicado = "   "; }), 6));

        Assert.Contains("justificación", ex.Message);
        Assert.Contains("Justificación", ex.Errores);
    }

    [Fact]
    public async Task Registrar_confirmando_la_justificacion_no_puede_superar_300_caracteres()
    {
        _da.BuscarCoincidenciasAsync(default, default, default, default).ReturnsForAnyArgs(new List<CoincidenciaProspectoDto> { new() { Tipo = "Cliente", IdEmpresa = 1, Empresa = "X" } });

        await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarProspectoAsync(Registro(d => { d.ConfirmarDuplicado = true; d.JustificacionDuplicado = new string('a', 301); }), 6));
    }

    [Fact]
    public async Task Registrar_confirmando_el_duplicado_guarda_la_justificacion_y_la_audita()
    {
        _da.BuscarCoincidenciasAsync(default, default, default, default).ReturnsForAnyArgs(new List<CoincidenciaProspectoDto> { new() { Tipo = "Cliente", IdEmpresa = 1, Empresa = "Hotel Los Sueños" } });
        _da.InsertarProspectoAsync(default!, default, default, default, default, default, default, default, default, default, default, default).ReturnsForAnyArgs(5);
        ProspectoRegistrado();

        var r = await _flujo.RegistrarProspectoAsync(Registro(d => { d.ConfirmarDuplicado = true; d.JustificacionDuplicado = " Sucursal distinta "; }), 6);

        Assert.False(r.RequiereConfirmacion);
        await _da.Received(1).InsertarProspectoAsync(Arg.Any<string>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>(),
            Arg.Any<int?>(), Arg.Any<string?>(), Arg.Any<int>(), true, "Sucursal distinta", Arg.Any<int>());
        await _auditoria.Received(1).RegistrarAsync(6, "CRM", "Prospecto", 5, "PROSPECTO_REGISTRADO", Arg.Is<string?>(s => s!.Contains("Sucursal distinta")));
    }

    // ====================================================================================================================
    // CRMGPSC-002 Consultar
    // ====================================================================================================================
    [Fact]
    public async Task Listar_con_rango_de_fechas_invalido_se_rechaza_con_el_mensaje_de_la_historia()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ListarProspectosAsync(null, null, null, null, null, new DateTime(2026, 11, 20), new DateTime(2026, 11, 1)));

        Assert.Equal("La fecha inicial no puede ser posterior a la final", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().ListarProspectosAsync(default, default, default, default, default, default, default);
    }

    [Fact]
    public async Task Listar_envia_todos_los_filtros_normalizados()
    {
        _da.ListarProspectosAsync(default, default, default, default, default, default, default).ReturnsForAnyArgs(new List<ProspectoDto>());

        await _flujo.ListarProspectosAsync("  hotel ", "Transporte", " ", "Nuevo", 6, new DateTime(2026, 11, 1, 8, 0, 0), new DateTime(2026, 11, 30));

        await _da.Received(1).ListarProspectosAsync("hotel", "Transporte", null, "Nuevo", 6, new DateTime(2026, 11, 1), new DateTime(2026, 11, 30));
    }

    [Fact]
    public async Task Listar_con_el_mismo_dia_como_inicio_y_fin_es_valido()
    {
        _da.ListarProspectosAsync(default, default, default, default, default, default, default).ReturnsForAnyArgs(new List<ProspectoDto>());

        await _flujo.ListarProspectosAsync(null, null, null, null, null, new DateTime(2026, 11, 12), new DateTime(2026, 11, 12));

        await _da.ReceivedWithAnyArgs(1).ListarProspectosAsync(default, default, default, default, default, default, default);
    }

    [Fact]
    public async Task Detalle_de_un_prospecto_inexistente_se_rechaza()
    {
        _da.ObtenerDetalleProspectoAsync(99, 6).Returns((ProspectoDetalleDto?)null);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ObtenerDetalleProspectoAsync(99, 6));

        Assert.Equal("El prospecto indicado no existe.", ex.Message);
    }

    [Fact]
    public async Task Detalle_devuelve_todas_las_secciones()
    {
        var detalle = new ProspectoDetalleDto { Prospecto = Prospecto() };
        _da.ObtenerDetalleProspectoAsync(5, 6).Returns(detalle);

        Assert.Same(detalle, await _flujo.ObtenerDetalleProspectoAsync(5, 6));
    }

    // ====================================================================================================================
    // CRMGPSC-003 Editar
    // ====================================================================================================================
    [Fact]
    public async Task Editar_correctamente_conserva_el_id_y_audita_valores_anteriores_y_nuevos()
    {
        _da.ObtenerProspectoAsync(5).Returns(Prospecto(), Prospecto(ajustar: p => { p.Sector = "Seguridad"; p.TamanoFlota = 40; }));
        _da.EditarProspectoAsync(default, default!, default, default, default, default, default, default, default, default, default).ReturnsForAnyArgs(Anterior());

        var r = await _flujo.EditarProspectoAsync(5, Edicion(d => { d.Sector = "Seguridad"; d.TamanoFlota = 40; }), 6);

        Assert.Equal(5, r.IdProspecto);
        Assert.Equal("Seguridad", r.Sector);
        await _auditoria.Received(1).RegistrarAsync(6, "CRM", "Prospecto", 5, "PROSPECTO_EDITADO",
            Arg.Is<string?>(s => s!.Contains("Sector: «Transporte» -> «Seguridad»") && s.Contains("Tamaño de la flota: «20» -> «40»")));
    }

    [Theory]
    [InlineData("Convertido")]
    [InlineData("Descartado")]
    public async Task Editar_un_prospecto_en_estado_final_no_se_permite(string estado)
    {
        _da.ObtenerProspectoAsync(5).Returns(Prospecto(estado, p => p.ClienteEmpresa = "Hotel Los Sueños"));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.EditarProspectoAsync(5, Edicion(), 6));

        if (estado == "Convertido") Assert.Contains("Hotel Los Sueños", ex.Message);
        else Assert.Contains("Reactívelo", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().EditarProspectoAsync(default, default!, default, default, default, default, default, default, default, default, default);
    }

    [Fact]
    public async Task Editar_con_formato_invalido_conserva_la_version_anterior()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.EditarProspectoAsync(5, Edicion(d => d.Correo = "malo"), 6));

        Assert.Contains(ex.Errores, e => e.StartsWith("Correo electrónico"));
        await _da.DidNotReceiveWithAnyArgs().EditarProspectoAsync(default, default!, default, default, default, default, default, default, default, default, default);
    }

    [Fact]
    public async Task Editar_sin_medio_de_contacto_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.EditarProspectoAsync(5, Edicion(d => { d.Correo = null; d.Telefono = ""; }), 6));

        Assert.Contains("medio de contacto", ex.Message);
    }

    [Fact]
    public async Task Editar_cuando_el_dato_ya_existe_en_otro_registro_propaga_el_rechazo_del_procedimiento()
    {
        _da.ObtenerProspectoAsync(5).Returns(Prospecto());
        _da.EditarProspectoAsync(default, default!, default, default, default, default, default, default, default, default, default)
            .ReturnsForAnyArgs<Task<ProspectoAnteriorDto>>(_ => throw new ReglaNegocioException("Los datos ingresados coinciden con otro registro: prospecto PR-0002 «X» (mismo correo)."));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.EditarProspectoAsync(5, Edicion(d => d.Correo = "otro@x.example"), 6));

        Assert.Contains("PR-0002", ex.Message);
        await _auditoria.DidNotReceiveWithAnyArgs().RegistrarAsync(default, default!, default!, default, default!, default);
    }

    [Fact]
    public async Task Editar_con_un_responsable_inactivo_se_rechaza_pero_conservarlo_es_valido()
    {
        _da.ObtenerProspectoAsync(5).Returns(Prospecto(ajustar: p => { p.IdVendedor = 9; p.VendedorActivo = false; }));
        _da.EditarProspectoAsync(default, default!, default, default, default, default, default, default, default, default, default).ReturnsForAnyArgs(Anterior());

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.EditarProspectoAsync(5, Edicion(d => d.IdVendedor = 10), 6));
        Assert.Contains("inactivo", ex.Message);

        var r = await _flujo.EditarProspectoAsync(5, Edicion(d => d.IdVendedor = 9), 6);
        Assert.Equal(5, r.IdProspecto);
    }

    [Fact]
    public async Task Editar_un_prospecto_inexistente_se_rechaza()
    {
        _da.ObtenerProspectoAsync(99).Returns((ProspectoDto?)null);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.EditarProspectoAsync(99, Edicion(), 6));

        Assert.Equal("El prospecto indicado no existe.", ex.Message);
    }

    // ====================================================================================================================
    // CRMGPSC-004 Descartar y reactivar
    // ====================================================================================================================
    private static ProspectoAccionFilaDto Fila(string resultado, string estado, Action<ProspectoAccionFilaDto>? ajustar = null)
    {
        var f = new ProspectoAccionFilaDto { Resultado = resultado, Estado = estado };
        ajustar?.Invoke(f);
        return f;
    }

    [Fact]
    public async Task Descartar_correctamente_cancela_seguimientos_y_audita()
    {
        _da.ObtenerProspectoAsync(5).Returns(Prospecto(), Prospecto("Descartado"));
        _da.DescartarProspectoAsync(5, "Precio", new DateTime(2026, 11, 12), "Muy caro", 6)
            .Returns(Fila("Aplicado", "Descartado", f => { f.SeguimientosCancelados = 2; f.SeriesCanceladas = 1; }));

        var r = await _flujo.DescartarProspectoAsync(5, new DescartarProspectoDto { Motivo = "Precio", Observacion = " Muy caro " }, 6);

        Assert.Equal(ResultadosProspecto.Aplicado, r.Resultado);
        Assert.Equal(2, r.SeguimientosCancelados);
        Assert.Equal(1, r.SeriesCanceladas);
        Assert.Contains("PR-0005", r.Mensaje);
        await _auditoria.Received(1).RegistrarAsync(6, "CRM", "Prospecto", 5, "PROSPECTO_DESCARTADO", Arg.Is<string?>(s => s!.Contains("Precio") && s.Contains("seguimientos cancelados: 2")));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("  ")]
    [InlineData("Un motivo inventado")]
    public async Task Descartar_sin_motivo_valido_se_rechaza(string? motivo)
    {
        await Assert.ThrowsAsync<ValidacionException>(() => _flujo.DescartarProspectoAsync(5, new DescartarProspectoDto { Motivo = motivo }, 6));

        await _da.DidNotReceiveWithAnyArgs().DescartarProspectoAsync(default, default!, default, default, default);
    }

    [Fact]
    public async Task Descartar_con_fecha_futura_se_rechaza_pero_la_de_hoy_se_acepta()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.DescartarProspectoAsync(5, new DescartarProspectoDto { Motivo = "Precio", Fecha = new DateTime(2026, 11, 13) }, 6));
        Assert.Contains("futura", ex.Message);

        _da.ObtenerProspectoAsync(5).Returns(Prospecto());
        _da.DescartarProspectoAsync(default, default!, default, default, default).ReturnsForAnyArgs(Fila("Aplicado", "Descartado"));
        await _flujo.DescartarProspectoAsync(5, new DescartarProspectoDto { Motivo = "Precio", Fecha = new DateTime(2026, 11, 12, 23, 59, 0) }, 6);
    }

    [Fact]
    public async Task Descartar_con_observacion_larga_se_rechaza()
    {
        await Assert.ThrowsAsync<ValidacionException>(() => _flujo.DescartarProspectoAsync(5, new DescartarProspectoDto { Motivo = "Precio", Observacion = new string('a', 501) }, 6));
    }

    [Fact]
    public async Task Descartar_un_prospecto_convertido_se_rechaza_y_devuelve_el_cliente()
    {
        _da.ObtenerProspectoAsync(5).Returns(Prospecto("Convertido", p => { p.IdCliente = 2; p.ClienteEmpresa = "Autobuses San José"; }));
        _da.DescartarProspectoAsync(default, default!, default, default, default)
            .ReturnsForAnyArgs(Fila("Convertido", "Convertido", f => { f.IdCliente = 2; f.ClienteEmpresa = "Autobuses San José"; }));

        var r = await _flujo.DescartarProspectoAsync(5, new DescartarProspectoDto { Motivo = "Precio" }, 6);

        Assert.Equal(ResultadosProspecto.Rechazado, r.Resultado);
        Assert.Equal(2, r.IdCliente);
        Assert.Contains("Autobuses San José", r.Mensaje);
        await _auditoria.DidNotReceiveWithAnyArgs().RegistrarAsync(default, default!, default!, default, default!, default);
    }

    [Fact]
    public async Task Descartar_un_prospecto_ya_descartado_no_duplica_el_movimiento()
    {
        _da.ObtenerProspectoAsync(5).Returns(Prospecto("Descartado"));
        _da.DescartarProspectoAsync(default, default!, default, default, default).ReturnsForAnyArgs(Fila("SinCambios", "Descartado"));

        var r = await _flujo.DescartarProspectoAsync(5, new DescartarProspectoDto { Motivo = "Precio" }, 6);

        Assert.Equal(ResultadosProspecto.SinCambios, r.Resultado);
        Assert.Equal("Descartado", r.EstadoActual);
        Assert.Contains("ya se encuentra en estado Descartado", r.Mensaje);
        await _auditoria.DidNotReceiveWithAnyArgs().RegistrarAsync(default, default!, default!, default, default!, default);
    }

    [Fact]
    public async Task Descartar_un_prospecto_inexistente_se_rechaza()
    {
        _da.ObtenerProspectoAsync(99).Returns((ProspectoDto?)null);

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.DescartarProspectoAsync(99, new DescartarProspectoDto { Motivo = "Precio" }, 6));
    }

    private static ReactivarProspectoDto Reactivacion(Action<ReactivarProspectoDto>? ajustar = null)
    {
        var dto = new ReactivarProspectoDto { EstadoInicial = "En negociación", FechaHoraSeguimiento = new DateTime(2026, 11, 14, 9, 30, 0) };
        ajustar?.Invoke(dto);
        return dto;
    }

    [Fact]
    public async Task Reactivar_correctamente_cambia_el_estado_y_genera_el_seguimiento()
    {
        _da.ObtenerProspectoAsync(5).Returns(Prospecto("Descartado", p => p.MotivoDescarte = "Precio"), Prospecto("En negociación", p => p.MotivoDescarte = "Precio"));
        _da.ReactivarProspectoAsync(5, "En negociación", new DateTime(2026, 11, 14, 9, 30, 0), null, 6).Returns(Fila("Aplicado", "En negociación", f => f.IdSeguimiento = 41));

        var r = await _flujo.ReactivarProspectoAsync(5, Reactivacion(), 6);

        Assert.Equal(ResultadosProspecto.Aplicado, r.Resultado);
        Assert.Equal(41, r.IdSeguimientoCreado);
        Assert.Equal("Precio", r.Prospecto!.MotivoDescarte);
        await _auditoria.Received(1).RegistrarAsync(6, "CRM", "Prospecto", 5, "PROSPECTO_REACTIVADO", Arg.Is<string?>(s => s!.Contains("En negociación") && s.Contains("Precio")));
    }

    [Theory]
    [InlineData(null, "2026-11-14T09:30:00")]
    [InlineData("Convertido", "2026-11-14T09:30:00")]
    [InlineData("Descartado", "2026-11-14T09:30:00")]
    [InlineData("Nuevo", null)]
    [InlineData("Nuevo", "2026-11-12T11:59:00")]
    [InlineData("Nuevo", "2026-11-12T12:00:00")]
    public async Task Reactivar_con_datos_invalidos_se_rechaza(string? estadoInicial, string? fechaHora)
    {
        var dto = Reactivacion(d => { d.EstadoInicial = estadoInicial; d.FechaHoraSeguimiento = fechaHora is null ? null : DateTime.Parse(fechaHora); });

        await Assert.ThrowsAsync<ValidacionException>(() => _flujo.ReactivarProspectoAsync(5, dto, 6));

        await _da.DidNotReceiveWithAnyArgs().ReactivarProspectoAsync(default, default!, default, default, default);
    }

    [Fact]
    public async Task Reactivar_con_el_responsable_inactivo_exige_elegir_otro_vendedor_activo()
    {
        _da.ObtenerProspectoAsync(5).Returns(Prospecto("Descartado", p => { p.IdVendedor = 9; p.VendedorActivo = false; }));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ReactivarProspectoAsync(5, Reactivacion(), 6));
        Assert.Contains("responsable", ex.Message);
        Assert.Contains("inactivo", ex.Message);

        var ex2 = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ReactivarProspectoAsync(5, Reactivacion(d => d.IdVendedor = 10), 6));
        Assert.Contains("vendedor activo", ex2.Message);
        await _da.DidNotReceiveWithAnyArgs().ReactivarProspectoAsync(default, default!, default, default, default);
    }

    [Fact]
    public async Task Reactivar_con_otro_vendedor_activo_lo_envia_como_nuevo_responsable()
    {
        _da.ObtenerProspectoAsync(5).Returns(Prospecto("Descartado", p => { p.IdVendedor = 9; p.VendedorActivo = false; }));
        _da.ReactivarProspectoAsync(default, default!, default, default, default).ReturnsForAnyArgs(Fila("Aplicado", "En negociación", f => f.IdSeguimiento = 7));

        await _flujo.ReactivarProspectoAsync(5, Reactivacion(d => d.IdVendedor = 7), 6);

        await _da.Received(1).ReactivarProspectoAsync(5, "En negociación", Arg.Any<DateTime>(), 7, 6);
    }

    [Fact]
    public async Task Reactivar_un_prospecto_que_ya_esta_activo_no_duplica_el_movimiento()
    {
        _da.ObtenerProspectoAsync(5).Returns(Prospecto("En negociación"));
        _da.ReactivarProspectoAsync(default, default!, default, default, default).ReturnsForAnyArgs(Fila("SinCambios", "En negociación"));

        var r = await _flujo.ReactivarProspectoAsync(5, Reactivacion(), 6);

        Assert.Equal(ResultadosProspecto.SinCambios, r.Resultado);
        Assert.Contains("ya está activo", r.Mensaje);
        Assert.Contains("En negociación", r.Mensaje);
        await _auditoria.DidNotReceiveWithAnyArgs().RegistrarAsync(default, default!, default!, default, default!, default);
    }

    [Fact]
    public async Task Reactivar_un_prospecto_convertido_se_rechaza()
    {
        _da.ObtenerProspectoAsync(5).Returns(Prospecto("Convertido", p => { p.IdCliente = 2; p.ClienteEmpresa = "Autobuses San José"; }));
        _da.ReactivarProspectoAsync(default, default!, default, default, default).ReturnsForAnyArgs(Fila("Convertido", "Convertido", f => f.IdCliente = 2));

        var r = await _flujo.ReactivarProspectoAsync(5, Reactivacion(), 6);

        Assert.Equal(ResultadosProspecto.Rechazado, r.Resultado);
        Assert.Equal(2, r.IdCliente);
    }

    // ====================================================================================================================
    // Contactos de empresa
    // ====================================================================================================================
    private static ContactoEmpresaDto Contacto(int id = 11, Action<ContactoEmpresaDto>? ajustar = null)
    {
        var c = new ContactoEmpresaDto
        {
            IdContactoEmpresa = id, Tipo = "Prospecto", IdEmpresa = 5, Empresa = "Transportes del Sur", EstadoEmpresa = "Nuevo", EmpresaActiva = true, Nombre = "Ana Rojas",
            Cargo = "Gerente", Telefono = "2222-1111", Correo = "ana@transportessur.example", PreferenciaContacto = "Correo", Activo = true
        };
        ajustar?.Invoke(c);
        return c;
    }

    private static RegistrarContactoEmpresaDto RegistroContacto(Action<RegistrarContactoEmpresaDto>? ajustar = null)
    {
        var dto = new RegistrarContactoEmpresaDto
        {
            Tipo = "Prospecto", IdEmpresa = 5, Nombre = "Ana Rojas", Cargo = "Gerente", Telefono = "2222-1111", Correo = "ana@transportessur.example",
            FechaCumpleanos = new DateTime(1988, 5, 17), PreferenciaContacto = "Correo"
        };
        ajustar?.Invoke(dto);
        return dto;
    }

    private void EmpresaActiva(string tipo = "Prospecto", bool activa = true) =>
        _catalogos.ObtenerEmpresaAsync(tipo, 5).Returns(new CrmEmpresaBasicaDto { Tipo = tipo, IdEmpresa = 5, Empresa = "Transportes del Sur", Estado = activa ? "Nuevo" : "Descartado", Activa = activa });

    private void ContactoInsertado(int id = 11, Action<ContactoEmpresaDto>? ajustar = null)
    {
        _da.InsertarContactoAsync(default!, default, default!, default, default, default, default, default!, default, default, default).ReturnsForAnyArgs(id);
        _da.ObtenerContactoAsync(id).Returns(Contacto(id, ajustar));
    }

    [Fact]
    public async Task Registrar_contacto_correctamente_lo_vincula_a_la_empresa_y_audita()
    {
        EmpresaActiva();
        ContactoInsertado();

        var r = await _flujo.RegistrarContactoAsync(RegistroContacto(), 6);

        Assert.Equal(ResultadosContacto.Guardado, r.Resultado);
        Assert.Equal(11, r.Contacto!.IdContactoEmpresa);
        Assert.Contains("CT-0011", r.Mensaje);
        await _da.Received(1).InsertarContactoAsync("Prospecto", 5, "Ana Rojas", "Gerente", "2222-1111", "ana@transportessur.example", new DateTime(1988, 5, 17), "Correo", false, false, 6);
        await _auditoria.Received(1).RegistrarAsync(6, "CRM", "ContactoEmpresa", 11, "CONTACTO_REGISTRADO", Arg.Any<string?>());
    }

    [Fact]
    public async Task Registrar_contacto_sin_nombre_ni_medios_pide_los_datos_minimos()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarContactoAsync(RegistroContacto(d => { d.Nombre = " "; d.Telefono = null; d.Correo = ""; }), 6));

        Assert.Contains("nombre", ex.Message);
        Assert.Contains("medio de contacto", ex.Message);
        Assert.Contains("Nombre completo", ex.Errores);
        Assert.Contains("Teléfono", ex.Errores);
        Assert.Contains("Correo electrónico", ex.Errores);
        await _da.DidNotReceiveWithAnyArgs().InsertarContactoAsync(default!, default, default!, default, default, default, default, default!, default, default, default);
    }

    [Theory]
    [InlineData("Teléfono")]
    [InlineData("Correo")]
    public async Task Registrar_contacto_con_un_solo_medio_es_valido(string medio)
    {
        EmpresaActiva();
        ContactoInsertado();

        var r = await _flujo.RegistrarContactoAsync(RegistroContacto(d => { if (medio == "Teléfono") d.Correo = null; else d.Telefono = null; }), 6);

        Assert.Equal(ResultadosContacto.Guardado, r.Resultado);
    }

    [Fact]
    public async Task Registrar_contacto_con_formatos_invalidos_indica_cada_campo()
    {
        var dto = RegistroContacto(d => { d.Correo = "malo"; d.Telefono = "12"; d.FechaCumpleanos = new DateTime(2026, 11, 13); });

        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarContactoAsync(dto, 6));

        Assert.Equal(3, ex.Errores.Count);
        Assert.Contains(ex.Errores, e => e.StartsWith("Correo electrónico"));
        Assert.Contains(ex.Errores, e => e.StartsWith("Teléfono"));
        Assert.Contains(ex.Errores, e => e.StartsWith("Fecha de cumpleaños"));
    }

    [Theory]
    [InlineData("1899-12-31", false)]
    [InlineData("1900-01-01", true)]
    [InlineData("2026-11-12", true)]
    [InlineData("2026-11-13", false)]
    public async Task Registrar_contacto_valida_los_limites_de_la_fecha_de_cumpleanos(string fecha, bool valida)
    {
        EmpresaActiva();
        ContactoInsertado();
        var dto = RegistroContacto(d => d.FechaCumpleanos = DateTime.Parse(fecha));

        if (valida) Assert.Equal(ResultadosContacto.Guardado, (await _flujo.RegistrarContactoAsync(dto, 6)).Resultado);
        else await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarContactoAsync(dto, 6));
    }

    [Fact]
    public async Task Registrar_contacto_sin_empresa_o_con_tipo_invalido_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarContactoAsync(RegistroContacto(d => d.IdEmpresa = null), 6));
        Assert.Contains("Empresa", ex.Errores);

        await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarContactoAsync(RegistroContacto(d => d.Tipo = "Proveedor"), 6));
    }

    [Fact]
    public async Task Registrar_contacto_en_una_empresa_inexistente_se_rechaza()
    {
        _catalogos.ObtenerEmpresaAsync("Prospecto", 5).Returns((CrmEmpresaBasicaDto?)null);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarContactoAsync(RegistroContacto(), 6));

        Assert.Equal("La empresa indicada no existe.", ex.Message);
    }

    [Fact]
    public async Task Registrar_contacto_en_un_prospecto_descartado_o_convertido_no_se_permite()
    {
        EmpresaActiva(activa: false);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarContactoAsync(RegistroContacto(), 6));

        Assert.Contains("descartado o convertido", ex.Message);
    }

    [Fact]
    public async Task Registrar_contacto_repetido_en_la_empresa_devuelve_el_existente_sin_crear()
    {
        EmpresaActiva();
        _da.BuscarCoincidenciasContactoAsync("Prospecto", 5, "ana@transportessur.example", "2222-1111", null)
            .Returns(new List<CoincidenciaContactoDto> { new() { IdContactoEmpresa = 3, Nombre = "Ana R.", MotivoCoincidencia = "mismo correo" } });
        _da.ObtenerContactoAsync(3).Returns(Contacto(3));

        var r = await _flujo.RegistrarContactoAsync(RegistroContacto(), 6);

        Assert.Equal(ResultadosContacto.Duplicado, r.Resultado);
        Assert.Equal(3, r.ContactoExistente!.IdContactoEmpresa);
        Assert.Contains("CT-0003", r.Mensaje);
        Assert.Contains("Abra el contacto existente", r.Mensaje);
        await _da.DidNotReceiveWithAnyArgs().InsertarContactoAsync(default!, default, default!, default, default, default, default, default!, default, default, default);
    }

    [Fact]
    public async Task Registrar_contacto_principal_cuando_ya_hay_otro_pide_confirmar_el_cambio()
    {
        EmpresaActiva();
        _da.ListarContactosAsync("Prospecto", 5, null, true).Returns(new List<ContactoEmpresaDto> { Contacto(3, c => { c.Nombre = "Beatriz"; c.EsPrincipal = true; }) });

        var r = await _flujo.RegistrarContactoAsync(RegistroContacto(d => d.EsPrincipal = true), 6);

        Assert.Equal(ResultadosContacto.RequiereConfirmacion, r.Resultado);
        Assert.True(r.RequiereConfirmacion);
        Assert.Equal("Beatriz", r.PrincipalActual!.Nombre);
        await _da.DidNotReceiveWithAnyArgs().InsertarContactoAsync(default!, default, default!, default, default, default, default, default!, default, default, default);
    }

    [Fact]
    public async Task Registrar_contacto_principal_confirmando_retira_la_marca_al_anterior()
    {
        EmpresaActiva();
        _da.ListarContactosAsync("Prospecto", 5, null, true).Returns(new List<ContactoEmpresaDto> { Contacto(3, c => { c.Nombre = "Beatriz"; c.EsPrincipal = true; }) });
        ContactoInsertado(ajustar: c => c.EsPrincipal = true);

        var r = await _flujo.RegistrarContactoAsync(RegistroContacto(d => { d.EsPrincipal = true; d.ConfirmarCambioPrincipal = true; }), 6);

        Assert.Equal(ResultadosContacto.Guardado, r.Resultado);
        Assert.Contains("Beatriz", r.Mensaje);
        await _da.Received(1).InsertarContactoAsync("Prospecto", 5, "Ana Rojas", "Gerente", "2222-1111", "ana@transportessur.example", Arg.Any<DateTime?>(), "Correo", true, true, 6);
    }

    [Fact]
    public async Task Registrar_contacto_principal_sin_otro_principal_no_pide_confirmacion()
    {
        EmpresaActiva();
        ContactoInsertado(ajustar: c => c.EsPrincipal = true);

        var r = await _flujo.RegistrarContactoAsync(RegistroContacto(d => d.EsPrincipal = true), 6);

        Assert.Equal(ResultadosContacto.Guardado, r.Resultado);
    }

    [Fact]
    public async Task Editar_contacto_correctamente_audita_valores_anteriores_y_nuevos()
    {
        _da.ObtenerContactoAsync(11).Returns(Contacto(), Contacto(ajustar: c => c.Cargo = "Directora"));
        _da.EditarContactoAsync(default, default!, default, default, default, default, default!, default, default, default)
            .ReturnsForAnyArgs(new ContactoAnteriorDto { Nombre = "Ana Rojas", Cargo = "Gerente", Telefono = "2222-1111", Correo = "ana@transportessur.example", PreferenciaContacto = "Correo" });

        var r = await _flujo.EditarContactoAsync(11, new EditarContactoEmpresaDto { Nombre = "Ana Rojas", Cargo = "Directora", Telefono = "2222-1111", Correo = "ana@transportessur.example", PreferenciaContacto = "Correo" }, 6);

        Assert.Equal(ResultadosContacto.Guardado, r.Resultado);
        await _auditoria.Received(1).RegistrarAsync(6, "CRM", "ContactoEmpresa", 11, "CONTACTO_EDITADO", Arg.Is<string?>(s => s!.Contains("Cargo: «Gerente» -> «Directora»")));
    }

    [Fact]
    public async Task Editar_contacto_con_el_telefono_de_otro_contacto_se_rechaza_mostrando_el_relacionado()
    {
        _da.ObtenerContactoAsync(11).Returns(Contacto());
        _da.BuscarCoincidenciasContactoAsync("Prospecto", 5, null, "2222-3333", 11)
            .Returns(new List<CoincidenciaContactoDto> { new() { IdContactoEmpresa = 4, Nombre = "Beatriz Solano", MotivoCoincidencia = "mismo teléfono" } });

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.EditarContactoAsync(11, new EditarContactoEmpresaDto { Nombre = "Ana Rojas", Telefono = "2222-3333", Correo = "ana@transportessur.example" }, 6));

        Assert.Contains("Beatriz Solano", ex.Message);
        Assert.Contains("CT-0004", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().EditarContactoAsync(default, default!, default, default, default, default, default!, default, default, default);
    }

    [Fact]
    public async Task Editar_contacto_sin_cambiar_correo_ni_telefono_no_busca_duplicados()
    {
        _da.ObtenerContactoAsync(11).Returns(Contacto());
        _da.EditarContactoAsync(default, default!, default, default, default, default, default!, default, default, default)
            .ReturnsForAnyArgs(new ContactoAnteriorDto { Nombre = "Ana Rojas", PreferenciaContacto = "Correo" });

        await _flujo.EditarContactoAsync(11, new EditarContactoEmpresaDto { Nombre = "Ana R. Mora", Telefono = "(2222) 1111", Correo = "ANA@transportessur.example" }, 6);

        await _da.DidNotReceiveWithAnyArgs().BuscarCoincidenciasContactoAsync(default!, default, default, default, default);
    }

    [Fact]
    public async Task Editar_contacto_con_formatos_invalidos_conserva_los_datos_y_marca_los_campos()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() =>
            _flujo.EditarContactoAsync(11, new EditarContactoEmpresaDto { Nombre = "Ana", Telefono = "x", Correo = "y", FechaCumpleanos = new DateTime(1800, 1, 1) }, 6));

        Assert.Equal(3, ex.Errores.Count);
        await _da.DidNotReceiveWithAnyArgs().EditarContactoAsync(default, default!, default, default, default, default, default!, default, default, default);
    }

    [Fact]
    public async Task Editar_contacto_inactivo_no_se_permite()
    {
        _da.ObtenerContactoAsync(11).Returns(Contacto(ajustar: c => c.Activo = false));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.EditarContactoAsync(11, new EditarContactoEmpresaDto { Nombre = "Ana", Telefono = "2222-1111" }, 6));

        Assert.Contains("inactivo", ex.Message);
    }

    [Fact]
    public async Task Editar_contacto_inexistente_se_rechaza()
    {
        _da.ObtenerContactoAsync(99).Returns((ContactoEmpresaDto?)null);

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.EditarContactoAsync(99, new EditarContactoEmpresaDto { Nombre = "Ana", Telefono = "2222-1111" }, 6));
    }

    [Fact]
    public async Task Editar_contacto_para_hacerlo_principal_pide_confirmar_si_hay_otro()
    {
        _da.ObtenerContactoAsync(11).Returns(Contacto());
        _da.ListarContactosAsync("Prospecto", 5, null, true).Returns(new List<ContactoEmpresaDto> { Contacto(3, c => { c.Nombre = "Beatriz"; c.EsPrincipal = true; }) });

        var r = await _flujo.EditarContactoAsync(11, new EditarContactoEmpresaDto { Nombre = "Ana Rojas", Telefono = "2222-1111", Correo = "ana@transportessur.example", EsPrincipal = true }, 6);

        Assert.Equal(ResultadosContacto.RequiereConfirmacion, r.Resultado);
        await _da.DidNotReceiveWithAnyArgs().EditarContactoAsync(default, default!, default, default, default, default, default!, default, default, default);
    }

    [Fact]
    public async Task Desactivar_contacto_exige_el_motivo()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.DesactivarContactoAsync(11, new DesactivarContactoDto { Motivo = "  " }, 6));
        Assert.Contains("motivo", ex.Message);

        await Assert.ThrowsAsync<ValidacionException>(() => _flujo.DesactivarContactoAsync(11, new DesactivarContactoDto { Motivo = new string('m', 301) }, 6));
    }

    [Fact]
    public async Task Desactivar_contacto_correctamente_lo_deja_inactivo_y_audita()
    {
        _da.ObtenerContactoAsync(11).Returns(Contacto(), Contacto(ajustar: c => c.Activo = false));
        _da.DesactivarContactoAsync(11, "Dejó la empresa", null, 6).Returns(new ContactoAccionFilaDto { Resultado = "Aplicado", Nombre = "Ana Rojas" });

        var r = await _flujo.DesactivarContactoAsync(11, new DesactivarContactoDto { Motivo = " Dejó la empresa " }, 6);

        Assert.Equal(ResultadosProspecto.Aplicado, r.Resultado);
        Assert.False(r.Contacto!.Activo);
        await _auditoria.Received(1).RegistrarAsync(6, "CRM", "ContactoEmpresa", 11, "CONTACTO_DESACTIVADO", Arg.Is<string?>(s => s!.Contains("Dejó la empresa")));
    }

    [Fact]
    public async Task Desactivar_el_contacto_principal_pide_elegir_otro_contacto_activo()
    {
        _da.ObtenerContactoAsync(11).Returns(Contacto(ajustar: c => c.EsPrincipal = true));
        _da.ListarContactosAsync("Prospecto", 5, null, true).Returns(new List<ContactoEmpresaDto> { Contacto(11, c => c.EsPrincipal = true), Contacto(12) });

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.DesactivarContactoAsync(11, new DesactivarContactoDto { Motivo = "Se fue" }, 6));

        Assert.Equal("Elija otro contacto activo como principal antes de desactivar.", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().DesactivarContactoAsync(default, default!, default, default);
    }

    [Fact]
    public async Task Desactivar_el_principal_con_un_nuevo_principal_que_no_es_de_la_empresa_se_rechaza()
    {
        _da.ObtenerContactoAsync(11).Returns(Contacto(ajustar: c => c.EsPrincipal = true));
        _da.ListarContactosAsync("Prospecto", 5, null, true).Returns(new List<ContactoEmpresaDto> { Contacto(11, c => c.EsPrincipal = true), Contacto(12) });

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.DesactivarContactoAsync(11, new DesactivarContactoDto { Motivo = "Se fue", IdNuevoPrincipal = 99 }, 6));

        Assert.Contains("activo de la misma empresa", ex.Message);
    }

    [Fact]
    public async Task Desactivar_el_principal_eligiendo_otro_lo_envia_al_procedimiento()
    {
        _da.ObtenerContactoAsync(11).Returns(Contacto(ajustar: c => c.EsPrincipal = true));
        _da.ListarContactosAsync("Prospecto", 5, null, true).Returns(new List<ContactoEmpresaDto> { Contacto(11, c => c.EsPrincipal = true), Contacto(12) });
        _da.DesactivarContactoAsync(11, "Se fue", 12, 6).Returns(new ContactoAccionFilaDto { Resultado = "Aplicado", Nombre = "Ana Rojas", NombreNuevoPrincipal = "Beatriz" });

        var r = await _flujo.DesactivarContactoAsync(11, new DesactivarContactoDto { Motivo = "Se fue", IdNuevoPrincipal = 12 }, 6);

        Assert.Contains("Beatriz", r.Mensaje);
    }

    [Fact]
    public async Task Desactivar_el_unico_contacto_activo_principal_no_exige_otro()
    {
        _da.ObtenerContactoAsync(11).Returns(Contacto(ajustar: c => c.EsPrincipal = true));
        _da.ListarContactosAsync("Prospecto", 5, null, true).Returns(new List<ContactoEmpresaDto> { Contacto(11, c => c.EsPrincipal = true) });
        _da.DesactivarContactoAsync(11, "Se fue", null, 6).Returns(new ContactoAccionFilaDto { Resultado = "Aplicado", Nombre = "Ana Rojas" });

        var r = await _flujo.DesactivarContactoAsync(11, new DesactivarContactoDto { Motivo = "Se fue" }, 6);

        Assert.Equal(ResultadosProspecto.Aplicado, r.Resultado);
    }

    [Fact]
    public async Task Desactivar_un_contacto_ya_inactivo_no_registra_otro_movimiento()
    {
        _da.ObtenerContactoAsync(11).Returns(Contacto(ajustar: c => c.Activo = false));

        var r = await _flujo.DesactivarContactoAsync(11, new DesactivarContactoDto { Motivo = "Otra vez" }, 6);

        Assert.Equal(ResultadosProspecto.SinCambios, r.Resultado);
        await _da.DidNotReceiveWithAnyArgs().DesactivarContactoAsync(default, default!, default, default);
        await _auditoria.DidNotReceiveWithAnyArgs().RegistrarAsync(default, default!, default!, default, default!, default);
    }

    [Fact]
    public async Task Reactivar_contacto_correctamente_lo_deja_activo_y_audita()
    {
        _da.ObtenerContactoAsync(11).Returns(Contacto(ajustar: c => c.Activo = false), Contacto());
        _da.ReactivarContactoAsync(11, 6).Returns(new ContactoAccionFilaDto { Resultado = "Aplicado", Nombre = "Ana Rojas" });

        var r = await _flujo.ReactivarContactoAsync(11, 6);

        Assert.Equal(ResultadosProspecto.Aplicado, r.Resultado);
        Assert.True(r.Contacto!.Activo);
        Assert.Contains("seguimientos", r.Mensaje);
        await _auditoria.Received(1).RegistrarAsync(6, "CRM", "ContactoEmpresa", 11, "CONTACTO_REACTIVADO", Arg.Any<string?>());
    }

    [Fact]
    public async Task Reactivar_contacto_que_tenia_marca_de_principal_informa_que_vuelve_sin_ella()
    {
        _da.ObtenerContactoAsync(11).Returns(Contacto(ajustar: c => c.Activo = false), Contacto());
        _da.ReactivarContactoAsync(11, 6).Returns(new ContactoAccionFilaDto { Resultado = "Aplicado", Nombre = "Ana Rojas", SinMarcaPrincipal = true });

        var r = await _flujo.ReactivarContactoAsync(11, 6);

        Assert.True(r.SinMarcaPrincipal);
        Assert.Contains("sin la marca de contacto principal", r.Mensaje);
    }

    [Fact]
    public async Task Reactivar_un_contacto_activo_no_hace_nada()
    {
        _da.ObtenerContactoAsync(11).Returns(Contacto());

        var r = await _flujo.ReactivarContactoAsync(11, 6);

        Assert.Equal(ResultadosProspecto.SinCambios, r.Resultado);
        await _da.DidNotReceiveWithAnyArgs().ReactivarContactoAsync(default, default);
    }

    [Fact]
    public async Task Reactivar_o_consultar_un_contacto_inexistente_se_rechaza()
    {
        _da.ObtenerContactoAsync(99).Returns((ContactoEmpresaDto?)null);

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ReactivarContactoAsync(99, 6));
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ObtenerContactoAsync(99));
    }

    [Theory]
    [InlineData("Otro", null, "tipo")]
    [InlineData("Prospecto", "Raro", "estado")]
    public async Task Listar_contactos_con_filtros_invalidos_se_rechaza(string tipo, string? estado, string _)
    {
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ListarContactosAsync(tipo, null, null, estado));
    }

    [Fact]
    public async Task Listar_contactos_traduce_el_estado_a_activo()
    {
        _da.ListarContactosAsync(default, default, default, default).ReturnsForAnyArgs(new List<ContactoEmpresaDto>());

        await _flujo.ListarContactosAsync("Prospecto", 5, " ana ", "inactivo");

        await _da.Received(1).ListarContactosAsync("Prospecto", 5, "ana", false);
    }
}
