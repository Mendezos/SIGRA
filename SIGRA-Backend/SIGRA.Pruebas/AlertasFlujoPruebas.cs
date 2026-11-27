using NSubstitute;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Modelos;
using SIGRA.Flujo.Flujos;

namespace SIGRA.Pruebas;

// DAR-018 y 019: alertas unificadas según los permisos del rol.
public class AlertasFlujoPruebas
{
    private const int Admin = 1, Tecnico = 4, SinPanel = 6;
    private readonly IAlertasDA _da = Substitute.For<IAlertasDA>();
    private readonly IUsuarioDA _usuarios = Substitute.For<IUsuarioDA>();
    private readonly IRolPermisoDA _permisos = Substitute.For<IRolPermisoDA>();
    private readonly AlertasFlujo _flujo;

    public AlertasFlujoPruebas()
    {
        _usuarios.ObtenerPorIdAsync(Admin).Returns(new UsuarioModel { IdUsuario = Admin, IdRol = 1, NombreRol = "Administrador del sistema", Activo = true });
        _usuarios.ObtenerPorIdAsync(Tecnico).Returns(new UsuarioModel { IdUsuario = Tecnico, IdRol = 4, NombreRol = "Técnico", Activo = true });
        _usuarios.ObtenerPorIdAsync(SinPanel).Returns(new UsuarioModel { IdUsuario = SinPanel, IdRol = 6, NombreRol = "Recepcionista", Activo = true });
        // El técnico consulta el panel, edita boletas (2) y solo consulta inventario (4); no ve facturación (7).
        _permisos.ObtenerPorRolAsync(4).Returns(new List<PermisoModuloDto>
        {
            new() { IdModulo = 5, Lectura = true }, new() { IdModulo = 2, Lectura = true, Edicion = true }, new() { IdModulo = 4, Lectura = true },
        });
        _permisos.ObtenerPorRolAsync(6).Returns(new List<PermisoModuloDto> { new() { IdModulo = 2, Lectura = true } });
        _da.ListarAsync().Returns(_ => new ListadoAlertasDto
        {
            Alertas =
            {
                new AlertaDto { Clave = "BOLETA:1:atrasada", IdModulo = 2, Titulo = "Boleta #1", Urgencia = 3 },
                new AlertaDto { Clave = "STOCK:1:2", IdModulo = 4, Titulo = "Radios", Urgencia = 2 },
                new AlertaDto { Clave = "FACTURA:9:Irregular", IdModulo = 7, Titulo = "Factura", Urgencia = 3 },
            },
        });
        _flujo = new AlertasFlujo(_da, _usuarios, _permisos);
    }

    [Fact]
    public async Task Cada_rol_ve_solo_las_alertas_de_sus_modulos_y_sabe_cuales_puede_atender()
    {
        var r = await _flujo.ListarAsync(Tecnico);

        Assert.Equal(new[] { "BOLETA:1:atrasada", "STOCK:1:2" }, r.Alertas.Select(a => a.Clave));
        Assert.True(r.Alertas[0].PuedeAtender);
        Assert.False(r.Alertas[1].PuedeAtender);
        Assert.Equal(3, (await _flujo.ListarAsync(Admin)).Alertas.Count);
    }

    [Fact]
    public async Task Sin_permiso_sobre_el_dashboard_no_se_consultan_las_alertas()
    {
        await Assert.ThrowsAsync<AccesoDenegadoException>(() => _flujo.ListarAsync(SinPanel));
    }

    [Fact]
    public async Task Atender_exige_una_nota_de_seguimiento()
    {
        var ex = await Assert.ThrowsAsync<ValidacionException>(() =>
            _flujo.AtenderAsync(new AtenderAlertaUnificadaDto { Clave = "BOLETA:1:atrasada", Nota = "  " }, Admin));

        Assert.Contains("Nota de seguimiento", ex.Errores);
        await _da.DidNotReceiveWithAnyArgs().AtenderAsync(default!, default, default!, default!, default);
    }

    [Fact]
    public async Task Atender_guarda_la_nota_con_el_usuario()
    {
        await _flujo.AtenderAsync(new AtenderAlertaUnificadaDto { Clave = "BOLETA:1:atrasada", Nota = " Se llamó al cliente " }, Tecnico);

        await _da.Received(1).AtenderAsync("BOLETA:1:atrasada", 2, "Boleta #1", "Se llamó al cliente", Tecnico);
    }

    [Fact]
    public async Task No_se_atiende_una_alerta_de_un_modulo_de_solo_consulta_ni_una_que_ya_no_existe()
    {
        await Assert.ThrowsAsync<AccesoDenegadoException>(() => _flujo.AtenderAsync(new AtenderAlertaUnificadaDto { Clave = "STOCK:1:2", Nota = "x" }, Tecnico));
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.AtenderAsync(new AtenderAlertaUnificadaDto { Clave = "FACTURA:9:Irregular", Nota = "x" }, Tecnico));
    }

    [Fact]
    public async Task Guardar_una_vista_exige_nombre_y_algun_filtro()
    {
        await Assert.ThrowsAsync<ValidacionException>(() => _flujo.GuardarVistaAsync(new GuardarVistaDto { Nombre = "", Filtros = "{}" }, Admin));
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _flujo.GuardarVistaAsync(new GuardarVistaDto { Nombre = "Urgentes", Filtros = "" }, Admin));

        await _flujo.GuardarVistaAsync(new GuardarVistaDto { Nombre = " Urgentes ", Filtros = "{\"urgencia\":\"3\"}" }, Admin);

        await _da.Received(1).GuardarVistaAsync(Admin, "Urgentes", "{\"urgencia\":\"3\"}");
    }
}
