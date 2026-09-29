using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;

namespace SIGRA.API.Controllers;

[ApiController]
[Route("api/roles")]
[Authorize(Roles = "Administrador del sistema")]
public class RolController : ControllerBase
{
    private readonly IRolFlujo _flujo;

    public RolController(IRolFlujo flujo) => _flujo = flujo;

    [HttpGet]
    public async Task<ActionResult<List<RolDto>>> Listar()
    {
        var roles = await _flujo.ListarAsync();
        return Ok(roles.Select(r => new RolDto { IdRol = r.IdRol, Nombre = r.Nombre, Activo = r.Activo }).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<RolDto>> Crear([FromBody] CrearRolDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            throw new ValidacionException("Debe completar todos los parámetros obligatorios.", new List<string> { "Nombre del rol" });

        var nuevo = await _flujo.CrearAsync(dto.Nombre, User.ObtenerIdUsuario());

        return Ok(new RolDto { IdRol = nuevo.IdRol, Nombre = nuevo.Nombre, Activo = nuevo.Activo });
    }

    [HttpPut("{idRol:int}")]
    public async Task<ActionResult<RolDto>> Editar(int idRol, [FromBody] EditarRolDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            throw new ValidacionException("Debe completar todos los parámetros obligatorios.", new List<string> { "Nombre del rol" });

        var actualizado = await _flujo.EditarAsync(idRol, dto.Nombre, User.ObtenerIdUsuario());

        return Ok(new RolDto { IdRol = actualizado.IdRol, Nombre = actualizado.Nombre, Activo = actualizado.Activo });
    }

    [HttpPatch("{idRol:int}/estado")]
    public async Task<ActionResult<RolDto>> CambiarEstado(int idRol, [FromBody] CambiarEstadoRolDto dto)
    {
        var actualizado = await _flujo.CambiarEstadoAsync(idRol, dto.Activo, User.ObtenerIdUsuario());

        return Ok(new RolDto { IdRol = actualizado.IdRol, Nombre = actualizado.Nombre, Activo = actualizado.Activo });
    }

    [HttpGet("{idRol:int}/permisos")]
    public async Task<ActionResult<List<PermisoModuloDto>>> ObtenerPermisos(int idRol)
    {
        return Ok(await _flujo.ObtenerPermisosAsync(idRol));
    }

    [HttpPut("{idRol:int}/permisos")]
    public async Task<ActionResult<List<PermisoModuloDto>>> DefinirPermisos(int idRol, [FromBody] List<PermisoModuloDto> permisos)
    {
        var actualizado = await _flujo.DefinirPermisosAsync(idRol, permisos, User.ObtenerIdUsuario());
        return Ok(actualizado);
    }
}
