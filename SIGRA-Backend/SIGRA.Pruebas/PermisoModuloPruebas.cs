using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Modelos;
using SIGRA.API.Filters;

namespace SIGRA.Pruebas;

public class PermisoModuloPruebas
{
    private const int Modulo = 11;

    private readonly IUsuarioDA _usuarios = Substitute.For<IUsuarioDA>();
    private readonly IRolPermisoDA _permisos = Substitute.For<IRolPermisoDA>();

    private AuthorizationFilterContext Contexto(string metodo, bool autenticado = true)
    {
        var servicios = new ServiceCollection()
            .AddSingleton(_usuarios)
            .AddSingleton(_permisos)
            .BuildServiceProvider();

        var http = new DefaultHttpContext { RequestServices = servicios };
        http.Request.Method = metodo;
        if (autenticado)
            http.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "7")], "prueba"));

        var accion = new ActionContext(http, new RouteData(), new ActionDescriptor());
        return new AuthorizationFilterContext(accion, new List<IFilterMetadata>());
    }

    private void RolConPermiso(bool lectura, bool escritura, bool edicion, bool eliminacion, bool activo = true)
    {
        _usuarios.ObtenerPorIdAsync(7).Returns(new UsuarioModel { IdUsuario = 7, IdRol = 3, Activo = activo });
        _permisos.ObtenerPorRolAsync(3).Returns(
        [
            new PermisoModuloDto { IdModulo = Modulo, Lectura = lectura, Escritura = escritura, Edicion = edicion, Eliminacion = eliminacion },
        ]);
    }

    private static int? Estado(AuthorizationFilterContext contexto) => contexto.Result switch
    {
        null => null,
        StatusCodeResult r => r.StatusCode,
        ObjectResult r => r.StatusCode,
        ForbidResult => 403,
        _ => -1,
    };

    [Theory]
    [InlineData("GET", true, false, false, false, true)]
    [InlineData("GET", false, true, true, true, false)]
    [InlineData("POST", false, true, false, false, true)]
    [InlineData("POST", true, false, true, true, false)]
    [InlineData("PUT", false, false, true, false, true)]
    [InlineData("PATCH", true, true, false, true, false)]
    [InlineData("DELETE", false, false, false, true, true)]
    [InlineData("DELETE", true, true, true, false, false)]
    public async Task El_verbo_exige_la_accion_correspondiente(string metodo, bool lectura, bool escritura, bool edicion, bool eliminacion, bool permitido)
    {
        RolConPermiso(lectura, escritura, edicion, eliminacion);
        var contexto = Contexto(metodo);

        await new PermisoModuloAttribute(Modulo).OnAuthorizationAsync(contexto);

        if (permitido) Assert.Null(contexto.Result);
        else Assert.Equal(403, Estado(contexto));
    }

    [Fact]
    public async Task Un_rol_sin_fila_en_el_modulo_no_tiene_acceso()
    {
        _usuarios.ObtenerPorIdAsync(7).Returns(new UsuarioModel { IdUsuario = 7, IdRol = 3, Activo = true });
        _permisos.ObtenerPorRolAsync(3).Returns([new PermisoModuloDto { IdModulo = 4, Lectura = true }]);
        var contexto = Contexto("GET");

        await new PermisoModuloAttribute(Modulo).OnAuthorizationAsync(contexto);

        Assert.Equal(403, Estado(contexto));
    }

    [Fact]
    public async Task Una_cuenta_inactiva_no_tiene_acceso_aunque_su_rol_tenga_permiso()
    {
        RolConPermiso(true, true, true, true, activo: false);
        var contexto = Contexto("GET");

        await new PermisoModuloAttribute(Modulo).OnAuthorizationAsync(contexto);

        Assert.Equal(403, Estado(contexto));
    }

    [Fact]
    public async Task Sin_sesion_responde_no_autorizado()
    {
        var contexto = Contexto("GET", autenticado: false);

        await new PermisoModuloAttribute(Modulo).OnAuthorizationAsync(contexto);

        Assert.Equal(401, Estado(contexto));
    }

    [Theory]
    [InlineData("Técnico", "Tecnico,Coordinador técnico", true)]
    [InlineData("tecnico", "Técnico", true)]
    [InlineData("Vendedor / Ejecutivo de cuenta", "Administrador del sistema,Técnico", false)]
    public void Los_roles_se_comparan_sin_importar_tildes_ni_mayusculas(string rolDelUsuario, string permitidos, bool esperado)
    {
        var contexto = Contexto("GET");
        contexto.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, "7"), new Claim(ClaimTypes.Role, rolDelUsuario)], "prueba"));

        new RolesPermitidosAttribute(permitidos).OnAuthorization(contexto);

        if (esperado) Assert.Null(contexto.Result);
        else Assert.Equal(403, Estado(contexto));
    }
}
