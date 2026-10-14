using NSubstitute;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Modelos;
using SIGRA.Flujo.Flujos;

namespace SIGRA.Pruebas;

public class InventarioFlujoPruebas
{
    private readonly IInventarioDA _da = Substitute.For<IInventarioDA>();
    private readonly IAuditoriaDA _auditoriaDA = Substitute.For<IAuditoriaDA>();
    private readonly IUsuarioDA _usuarioDA = Substitute.For<IUsuarioDA>();
    private readonly InventarioFlujo _flujo;

    public InventarioFlujoPruebas()
    {
        _flujo = new InventarioFlujo(_da, _auditoriaDA, _usuarioDA);
        _usuarioDA.ObtenerPorIdAsync(1).Returns(new UsuarioModel { IdUsuario = 1, Nombre = "Técnico de prueba" });
    }

    private static EquipoDetalleDto Equipo(string estado = "Disponible", bool porCantidad = false, int cantidad = 1) => new()
    {
        IdEquipo = 5,
        NumeroSerie = "SN-5",
        Estado = estado,
        ManejaCantidad = porCantidad,
        Cantidad = cantidad,
        Marca = "Kenwood",
        Modelo = "TK-3170"
    };

    private void PrepararEquipo(EquipoDetalleDto equipo)
    {
        _da.ObtenerEquipoAsync(equipo.IdEquipo, null).Returns(equipo);
        _da.ObtenerHistorialAsync(equipo.IdEquipo).Returns(new List<HistorialEquipoDto>());
    }

    private static RegistrarEquipoDto EquipoValido() => new()
    {
        IdCategoria = 2,
        Marca = "Kenwood",
        Modelo = "TK-3170",
        NumeroSerie = "SN-NUEVO",
        IdProveedor = 1,
        Propietario = "Radifax",
        FechaAdquisicion = DateTime.Today,
        CostoCompra = 100000
    };

    private void PrepararCatalogos(bool porCantidad = false)
    {
        _da.ListarCategoriasAsync().Returns(new List<CategoriaDto> { new() { IdCategoria = 2, Nombre = "Radio portátil", ManejaCantidad = porCantidad } });
        _da.ListarProveedoresAsync().Returns(new List<ProveedorDto> { new() { IdProveedor = 1, Nombre = "Proveedor" } });
    }

    // ---------- INVE-001 ----------
    [Fact]
    public async Task Registrar_equipo_sin_categoria_marca_modelo_o_serie_lista_los_faltantes()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() => _flujo.RegistrarEquipoAsync(new RegistrarEquipoDto { CostoCompra = 5 }, 1));

        Assert.Equal("Debe completar los campos obligatorios para registrar el equipo.", ex.Message);
        Assert.Equal(new[] { "Categoría", "Marca", "Modelo", "Número de serie" }, ex.Errores);
    }

    [Fact]
    public async Task Registrar_equipo_con_costo_negativo_se_rechaza()
    {
        var dto = EquipoValido();
        dto.CostoCompra = -1;

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarEquipoAsync(dto, 1));

        Assert.Equal("El costo de compra debe ser un valor numérico mayor o igual a cero.", ex.Message);
    }

    [Fact]
    public async Task Registrar_equipo_con_serie_duplicada_se_rechaza()
    {
        PrepararCatalogos();
        _da.ExisteEquipoPorSerieAsync("SN-NUEVO").Returns(true);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarEquipoAsync(EquipoValido(), 1));

        Assert.Equal("Ya existe un equipo registrado con ese número de serie.", ex.Message);
    }

    [Fact]
    public async Task Registrar_equipo_de_categoria_por_cantidad_exige_stock_inicial()
    {
        PrepararCatalogos(porCantidad: true);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarEquipoAsync(EquipoValido(), 1));

        Assert.Contains("cantidad en stock inicial", ex.Message);
    }

    [Fact]
    public async Task Registrar_equipo_con_foto_que_no_es_imagen_se_rechaza()
    {
        var dto = EquipoValido();
        dto.Foto = "texto-que-no-es-imagen";

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.RegistrarEquipoAsync(dto, 1));

        Assert.Contains("imagen válida", ex.Message);
    }

    // ---------- INVE-003 ----------
    [Fact]
    public async Task Baja_de_un_equipo_con_contrato_activo_se_rechaza()
    {
        PrepararEquipo(Equipo("Alquilado"));
        _da.TieneContratoActivoAsync(5).Returns(true);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.CambiarEstadoAsync(5, new CambiarEstadoEquipoDto { Estado = "Dado de baja", Motivo = "Daño" }, 1));

        Assert.Equal("No se puede dar de baja un equipo asignado a un contrato de alquiler activo.", ex.Message);
    }

    [Fact]
    public async Task Baja_sin_motivo_se_rechaza()
    {
        PrepararEquipo(Equipo());
        _da.TieneContratoActivoAsync(5).Returns(false);

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.CambiarEstadoAsync(5, new CambiarEstadoEquipoDto { Estado = "Dado de baja" }, 1));

        Assert.Equal("Debe indicar el motivo de la baja del equipo.", ex.Message);
    }

    [Fact]
    public async Task Un_equipo_dado_de_baja_no_cambia_de_estado()
    {
        PrepararEquipo(Equipo("Dado de baja"));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.CambiarEstadoAsync(5, new CambiarEstadoEquipoDto { Estado = "Disponible" }, 1));

        Assert.Contains("dado de baja", ex.Message);
    }

    [Fact]
    public async Task Cambio_de_estado_valido_registra_el_movimiento()
    {
        PrepararEquipo(Equipo());

        await _flujo.CambiarEstadoAsync(5, new CambiarEstadoEquipoDto { Estado = "En mantenimiento" }, 1);

        await _da.Received(1).CambiarEstadoAsync(5, "En mantenimiento", 1, "Cambio de estado", Arg.Is<string?>(x => x == null), Arg.Is<string?>(x => x == null));
    }

    [Fact]
    public async Task Cambio_a_un_estado_no_permitido_se_rechaza()
    {
        PrepararEquipo(Equipo());

        await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.CambiarEstadoAsync(5, new CambiarEstadoEquipoDto { Estado = "Extraviado" }, 1));
    }

    [Fact]
    public async Task Entrada_sin_tipo_de_movimiento_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.RegistrarEntradaAsync(new RegistrarMovimientoEquipoDto { IdEquipo = 5 }, 1));

        Assert.Equal("Debe seleccionar el tipo de movimiento de la entrada.", ex.Message);
    }

    [Fact]
    public async Task Salida_de_un_equipo_no_disponible_se_rechaza()
    {
        PrepararEquipo(Equipo("Alquilado"));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.RegistrarSalidaAsync(new RegistrarMovimientoEquipoDto { IdEquipo = 5, TipoMovimiento = "Pérdida", Observacion = "Extraviado" }, 1));

        Assert.Equal("El equipo no se encuentra disponible para registrar una salida.", ex.Message);
    }

    [Fact]
    public async Task Salida_por_perdida_da_de_baja_el_equipo()
    {
        PrepararEquipo(Equipo());

        await _flujo.RegistrarSalidaAsync(new RegistrarMovimientoEquipoDto { IdEquipo = 5, TipoMovimiento = "Pérdida", Observacion = "Extraviado en gira" }, 1);

        await _da.Received(1).CambiarEstadoAsync(5, "Dado de baja", 1, "Pérdida", "Extraviado en gira", "Pérdida: Extraviado en gira");
    }

    [Fact]
    public async Task Devolucion_de_cliente_solo_aplica_a_equipos_alquilados()
    {
        PrepararEquipo(Equipo("Disponible"));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.RegistrarEntradaAsync(new RegistrarMovimientoEquipoDto { IdEquipo = 5, TipoMovimiento = "Devolución de cliente" }, 1));

        Assert.Contains("equipo alquilado", ex.Message);
    }

    // ---------- INVE-005 ----------
    [Fact]
    public async Task Stock_minimo_negativo_se_rechaza()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.GuardarStockMinimoAsync(2, new GuardarStockMinimoDto { CantidadMinima = -1 }, 1));

        Assert.Contains("mayor o igual a cero", ex.Message);
    }

    // ---------- INVE-007 / INVE-011: integración con boletas ----------
    [Fact]
    public async Task Boleta_abierta_de_reparacion_pasa_el_equipo_a_en_reparacion()
    {
        PrepararEquipo(Equipo("Alquilado"));

        await _flujo.RegistrarBoletaAbiertaAsync(5, new EventoBoletaEquipoDto { IdTicket = 1, TipoServicio = "Reparación" }, 1);

        await _da.Received(1).CambiarEstadoAsync(5, "En reparación", 1, "Cambio de estado", Arg.Any<string?>(), Arg.Is<string?>(x => x == null));
    }

    [Fact]
    public async Task Boleta_cerrada_como_reparado_devuelve_a_alquilado_si_hay_contrato_activo()
    {
        PrepararEquipo(Equipo("En reparación"));
        _da.TieneContratoActivoAsync(5).Returns(true);

        await _flujo.RegistrarBoletaCerradaAsync(5, new EventoBoletaEquipoDto { IdTicket = 1, TipoServicio = "Reparación", Resultado = "Reparado" }, 1);

        await _da.Received(1).CambiarEstadoAsync(5, "Alquilado", 1, "Equipo reparado", Arg.Any<string?>(), Arg.Is<string?>(x => x == null));
        await _da.Received(1).RegistrarBitacoraAsync(5, 1, Arg.Is<string>(d => d.Contains("Reparado") && d.Contains("Técnico de prueba")));
    }

    [Fact]
    public async Task Boleta_cerrada_como_reparado_deja_disponible_si_no_hay_contrato()
    {
        PrepararEquipo(Equipo("En reparación"));
        _da.TieneContratoActivoAsync(5).Returns(false);

        await _flujo.RegistrarBoletaCerradaAsync(5, new EventoBoletaEquipoDto { IdTicket = 1, TipoServicio = "Reparación", Resultado = "Reparado" }, 1);

        await _da.Received(1).CambiarEstadoAsync(5, "Disponible", 1, "Equipo reparado", Arg.Any<string?>(), Arg.Is<string?>(x => x == null));
    }

    [Fact]
    public async Task Boleta_cerrada_como_no_reparado_no_cambia_el_estado_pero_deja_bitacora()
    {
        PrepararEquipo(Equipo("En reparación"));

        await _flujo.RegistrarBoletaCerradaAsync(5, new EventoBoletaEquipoDto { IdTicket = 1, TipoServicio = "Reparación", Resultado = "No reparado" }, 1);

        await _da.DidNotReceiveWithAnyArgs().CambiarEstadoAsync(default, default!, default, default!, default, default);
        await _da.Received(1).RegistrarBitacoraAsync(5, 1, Arg.Any<string>());
    }

    [Fact]
    public async Task Boleta_cerrada_con_resultado_invalido_se_rechaza()
    {
        PrepararEquipo(Equipo("En reparación"));

        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.RegistrarBoletaCerradaAsync(5, new EventoBoletaEquipoDto { TipoServicio = "Reparación", Resultado = "Quizás" }, 1));

        Assert.Contains("Reparado, No reparado o Garantía", ex.Message);
    }
}
