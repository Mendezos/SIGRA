using NSubstitute;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Modelos;
using SIGRA.Flujo.Flujos;

namespace SIGRA.Pruebas;

// CRMGPSC-019 a 021: conversión de prospectos, responsable comercial y perfil del cliente.
public class CrmClientesFlujoPruebas
{
    private const int Admin = 1, Vendedor = 6, Otro = 7;
    private readonly ICrmClientesDA _da = Substitute.For<ICrmClientesDA>();
    private readonly ICrmProspectosDA _prospectos = Substitute.For<ICrmProspectosDA>();
    private readonly ICrmCatalogosDA _catalogos = Substitute.For<ICrmCatalogosDA>();
    private readonly IAuditoriaDA _auditoria = Substitute.For<IAuditoriaDA>();
    private readonly IUsuarioDA _usuarios = Substitute.For<IUsuarioDA>();
    private readonly IRolPermisoDA _permisos = Substitute.For<IRolPermisoDA>();
    private readonly CrmClientesFlujo _flujo;

    public CrmClientesFlujoPruebas()
    {
        _usuarios.ObtenerPorIdAsync(Admin).Returns(new UsuarioModel { IdUsuario = Admin, IdRol = 1, NombreRol = "Administrador del sistema", Activo = true });
        _usuarios.ObtenerPorIdAsync(Vendedor).Returns(new UsuarioModel { IdUsuario = Vendedor, IdRol = 5, NombreRol = "Vendedor / Ejecutivo de cuenta", Activo = true });
        _usuarios.ObtenerPorIdAsync(Otro).Returns(new UsuarioModel { IdUsuario = Otro, IdRol = 5, NombreRol = "Vendedor / Ejecutivo de cuenta", Activo = true });
        _prospectos.ObtenerProspectoAsync(10).Returns(new ProspectoDto { IdProspecto = 10, Empresa = "Transportes Sol", Estado = "Nuevo", IdVendedor = Vendedor, Vendedor = "Kimberly" });
        _prospectos.BuscarCoincidenciasAsync(default, default, default, default).ReturnsForAnyArgs(new List<CoincidenciaProspectoDto>());
        _catalogos.ListarVendedoresAsync().Returns(new List<VendedorDto> { new() { IdUsuario = Vendedor, Nombre = "Kimberly" }, new() { IdUsuario = Otro, Nombre = "Otro Vendedor" } });
        _flujo = new CrmClientesFlujo(_da, _prospectos, _catalogos, _auditoria, _usuarios, _permisos);
    }

    private static ConvertirProspectoDto Venta(Action<VentaInicialDto>? ajustar = null)
    {
        var v = new VentaInicialDto { Producto = "Radios portátiles", Cantidad = 4, Monto = 560000, Moneda = "CRC", Fecha = DateTime.Today };
        ajustar?.Invoke(v);
        return new ConvertirProspectoDto { VentaInicial = v };
    }

    // ---------- CRMGPSC-019 ----------
    [Fact]
    public async Task Convertir_sin_venta_inicial_lista_todos_los_datos_pendientes()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.ConvertirProspectoAsync(10, new ConvertirProspectoDto(), Vendedor));

        Assert.Contains("Producto o servicio", ex.Errores);
        Assert.Contains("Cantidad", ex.Errores);
        Assert.Contains("Monto", ex.Errores);
        Assert.Contains("Moneda", ex.Errores);
        Assert.Contains("Fecha", ex.Errores);
        await _da.DidNotReceiveWithAnyArgs().ConvertirProspectoAsync(default, default, default!, default, default, default!, default, default);
    }

    [Fact]
    public async Task Convertir_con_moneda_no_permitida_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ConvertirProspectoAsync(10, Venta(v => v.Moneda = "EUR"), Vendedor));

        Assert.Contains("moneda", ex.Message);
    }

    [Fact]
    public async Task Convertir_con_fecha_futura_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ConvertirProspectoAsync(10, Venta(v => v.Fecha = DateTime.Today.AddDays(5)), Vendedor));

        Assert.Contains("posterior a hoy", ex.Message);
    }

    [Fact]
    public async Task Convertir_un_prospecto_ajeno_se_rechaza_para_un_vendedor_pero_no_para_el_administrador()
    {
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ConvertirProspectoAsync(10, Venta(), Otro));

        _da.ConvertirProspectoAsync(10, null, "Radios portátiles", 4, 560000, "CRC", Arg.Any<DateTime>(), Admin).Returns(22);
        var r = await _flujo.ConvertirProspectoAsync(10, Venta(), Admin);

        Assert.Equal("Convertido", r.Resultado);
        Assert.Equal(22, r.IdCliente);
    }

    [Theory]
    [InlineData("Convertido")]
    [InlineData("Descartado")]
    public async Task Convertir_un_prospecto_en_estado_final_se_rechaza(string estado)
    {
        _prospectos.ObtenerProspectoAsync(10).Returns(new ProspectoDto { IdProspecto = 10, Empresa = "X", Estado = estado, IdVendedor = Vendedor });

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ConvertirProspectoAsync(10, Venta(), Vendedor));
    }

    [Fact]
    public async Task Convertir_con_un_cliente_que_coincide_pide_vincular_y_no_crea_nada()
    {
        _prospectos.BuscarCoincidenciasAsync(default, default, default, default).ReturnsForAnyArgs(new List<CoincidenciaProspectoDto>
        {
            new() { Tipo = "Cliente", IdEmpresa = 3, Empresa = "Transportes Sol S.A.", MotivoCoincidencia = "mismo correo", Estado = "Activo" },
            new() { Tipo = "Prospecto", IdEmpresa = 4, Empresa = "Otro prospecto", MotivoCoincidencia = "mismo teléfono", Estado = "Nuevo" }
        });

        var r = await _flujo.ConvertirProspectoAsync(10, Venta(), Vendedor);

        Assert.Equal("RequiereVinculo", r.Resultado);
        Assert.Single(r.Coincidencias);
        Assert.Equal(3, r.Coincidencias[0].IdEmpresa);
        await _da.DidNotReceiveWithAnyArgs().ConvertirProspectoAsync(default, default, default!, default, default, default!, default, default);
    }

    [Fact]
    public async Task Convertir_vinculando_a_un_cliente_existente_deja_auditoria()
    {
        _da.ConvertirProspectoAsync(10, 3, Arg.Any<string>(), 4, 560000, "CRC", Arg.Any<DateTime>(), Vendedor).Returns(3);

        var dto = Venta();
        dto.IdClienteExistente = 3;
        var r = await _flujo.ConvertirProspectoAsync(10, dto, Vendedor);

        Assert.Equal("Convertido", r.Resultado);
        Assert.Contains("sin crear uno nuevo", r.Mensaje);
        await _auditoria.Received(1).RegistrarAsync(Vendedor, "CRM", "Prospecto", 10, "PROSPECTO_CONVERTIDO", Arg.Any<string?>());
    }

    // ---------- CRMGPSC-020 ----------
    [Fact]
    public async Task Asignar_responsable_solo_lo_hace_el_administrador()
    {
        await Assert.ThrowsAsync<AccesoDenegadoException>(() =>
            _flujo.AsignarResponsableAsync("clientes", 3, new AsignarResponsableDto { IdVendedor = Otro, Motivo = "x" }, Vendedor));
    }

    [Fact]
    public async Task Reasignar_un_prospecto_sin_motivo_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() =>
            _flujo.AsignarResponsableAsync("prospectos", 10, new AsignarResponsableDto { IdVendedor = Otro }, Admin));

        Assert.Contains("Motivo", ex.Errores);
    }

    [Fact]
    public async Task Asignar_a_un_vendedor_inactivo_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.AsignarResponsableAsync("prospectos", 10, new AsignarResponsableDto { IdVendedor = 99, Motivo = "x" }, Admin));

        Assert.Contains("inactivo", ex.Message);
    }

    [Fact]
    public async Task Asignar_al_mismo_vendedor_no_registra_auditoria_ni_duplica_el_cambio()
    {
        _da.AsignarResponsableAsync("Prospecto", 10, Vendedor, "otra vez", Admin)
            .Returns(new AsignarResponsableResultadoDto { Cambio = false, IdVendedorAnterior = Vendedor });

        var r = await _flujo.AsignarResponsableAsync("prospectos", 10, new AsignarResponsableDto { IdVendedor = Vendedor, Motivo = "otra vez" }, Admin);

        Assert.False(r.Cambio);
        Assert.StartsWith("No hubo cambios", r.Mensaje);
        await _auditoria.DidNotReceiveWithAnyArgs().RegistrarAsync(default, default!, default!, default, default!, default);
    }

    [Fact]
    public async Task Reasignar_informa_los_seguimientos_trasladados_y_deja_auditoria()
    {
        _da.AsignarResponsableAsync("Prospecto", 10, Otro, "Cambio de zona", Admin)
            .Returns(new AsignarResponsableResultadoDto { Cambio = true, IdVendedorAnterior = Vendedor, SeguimientosMovidos = 2 });

        var r = await _flujo.AsignarResponsableAsync("prospectos", 10, new AsignarResponsableDto { IdVendedor = Otro, Motivo = "Cambio de zona" }, Admin);

        Assert.True(r.Cambio);
        Assert.Contains("2 seguimiento(s)", r.Mensaje);
        await _auditoria.Received(1).RegistrarAsync(Admin, "CRM", "Prospecto", 10, "RESPONSABLE_REASIGNADO", Arg.Any<string?>());
    }

    // ---------- CRMGPSC-021 ----------
    [Fact]
    public async Task Perfil_oculta_las_secciones_sin_permiso_y_muestra_mensaje_en_las_vacias()
    {
        _da.ObtenerPerfilAsync(3, Vendedor).Returns(new PerfilClienteDto { Cliente = new ClienteEmpresaDto { IdCliente = 3, Empresa = "Transportes Sol" } });
        // El vendedor puede leer CRM (9) y Alquiler (3), pero no Tickets (2) ni Facturación (7).
        _permisos.ObtenerPorRolAsync(5).Returns(new List<PermisoModuloDto>
        {
            new() { IdModulo = 9, Lectura = true }, new() { IdModulo = 3, Lectura = true }
        });

        var perfil = await _flujo.ObtenerPerfilAsync(3, Vendedor);

        Assert.False(perfil.Tickets.Visible);
        Assert.Contains("no tiene permiso", perfil.Tickets.Mensaje);
        Assert.False(perfil.Facturas.Visible);
        Assert.True(perfil.Contratos.Visible);
        Assert.Equal("El cliente no tiene contratos de alquiler.", perfil.Contratos.Mensaje);
        Assert.True(perfil.Contactos.Visible);
    }

    [Fact]
    public async Task Perfil_de_un_cliente_que_no_existe_se_rechaza()
    {
        _da.ObtenerPerfilAsync(99, Admin).Returns((PerfilClienteDto?)null);

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ObtenerPerfilAsync(99, Admin));
    }
}
