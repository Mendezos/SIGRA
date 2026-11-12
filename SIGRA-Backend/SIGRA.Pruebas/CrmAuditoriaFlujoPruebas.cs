using NSubstitute;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Modelos;
using SIGRA.Flujo.Flujos;

namespace SIGRA.Pruebas;

// CRMGPSC-026: historial de cambios del CRM para el administrador.
public class CrmAuditoriaFlujoPruebas
{
    private const int Admin = 1, Vendedor = 5;
    private readonly ICrmAuditoriaDA _da = Substitute.For<ICrmAuditoriaDA>();
    private readonly IUsuarioDA _usuarios = Substitute.For<IUsuarioDA>();
    private readonly CrmAuditoriaFlujo _flujo;

    public CrmAuditoriaFlujoPruebas()
    {
        _usuarios.ObtenerPorIdAsync(Admin).Returns(new UsuarioModel { IdUsuario = Admin, IdRol = 1, NombreRol = "Administrador del sistema", Activo = true });
        _usuarios.ObtenerPorIdAsync(Vendedor).Returns(new UsuarioModel { IdUsuario = Vendedor, IdRol = 5, NombreRol = "Vendedor / Ejecutivo de cuenta", Activo = true });
        _da.ConsultarAsync(default!).ReturnsForAnyArgs(new PaginaAuditoriaCrmDto { Total = 1, Pagina = 1, TamanoPagina = 15, Items = { new EventoAuditoriaCrmDto { IdAuditoria = 9, Entidad = "Prospecto", Accion = "PROSPECTO_EDITADO" } } });
        _flujo = new CrmAuditoriaFlujo(_da, _usuarios);
    }

    [Fact]
    public async Task Un_vendedor_no_puede_consultar_el_historial()
    {
        await Assert.ThrowsAsync<AccesoDenegadoException>(() => _flujo.ConsultarAsync(new FiltroAuditoriaCrmDto(), Vendedor));
        await Assert.ThrowsAsync<AccesoDenegadoException>(() => _flujo.ObtenerDetalleAsync(9, Vendedor));
        await _da.DidNotReceiveWithAnyArgs().ConsultarAsync(default!);
    }

    [Fact]
    public async Task El_administrador_consulta_con_filtros_y_recibe_los_eventos()
    {
        var r = await _flujo.ConsultarAsync(new FiltroAuditoriaCrmDto { Entidad = "prospecto", Empresa = "  Hotel  ", Desde = new DateTime(2026, 11, 1), Hasta = new DateTime(2026, 11, 12) }, Admin);

        Assert.Single(r.Items);
        await _da.Received(1).ConsultarAsync(Arg.Is<FiltroAuditoriaCrmDto>(f => f.Entidad == "Prospecto" && f.Empresa == "Hotel"));
    }

    [Fact]
    public async Task Un_rango_de_fechas_invertido_no_consulta_y_pide_corregirlo()
    {
        var ex = await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _flujo.ConsultarAsync(new FiltroAuditoriaCrmDto { Desde = new DateTime(2026, 11, 12), Hasta = new DateTime(2026, 11, 1) }, Admin));

        Assert.Contains("fecha inicial", ex.Message);
        await _da.DidNotReceiveWithAnyArgs().ConsultarAsync(default!);
    }

    [Fact]
    public async Task Una_entidad_desconocida_se_rechaza()
    {
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ConsultarAsync(new FiltroAuditoriaCrmDto { Entidad = "Factura" }, Admin));
    }

    [Fact]
    public async Task El_detalle_de_un_evento_que_no_existe_se_rechaza()
    {
        _da.ObtenerDetalleAsync(99).Returns((DetalleAuditoriaCrmDto?)null);

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.ObtenerDetalleAsync(99, Admin));
    }

    [Fact]
    public async Task El_detalle_incluye_los_eventos_relacionados()
    {
        _da.ObtenerDetalleAsync(9).Returns(new DetalleAuditoriaCrmDto { Evento = new EventoAuditoriaCrmDto { IdAuditoria = 9 }, Relacionados = { new EventoAuditoriaCrmDto { IdAuditoria = 8 } } });

        var r = await _flujo.ObtenerDetalleAsync(9, Admin);

        Assert.Equal(9, r.Evento.IdAuditoria);
        Assert.Single(r.Relacionados);
    }
}
