using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;
using SIGRA.API.Filters;

namespace SIGRA.API.Controllers;

[ApiController]
[Route("api/contratos/plantillas")]
[PermisoModulo(7)]
public class PlantillasContratoController(IPlantillaContratoFlujo flujo) : ControllerBase
{
    private const string RolAdministrador = "Administrador del sistema";
    private const string RolesLectura = RolAdministrador + ",Vendedor / Ejecutivo de cuenta,Gerente";

    [HttpGet]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<List<PlantillaContratoDto>>> Listar([FromQuery] string? texto, [FromQuery] int? idCategoria, [FromQuery] string? estado) =>
        Ok(await flujo.ListarAsync(texto, idCategoria, estado));

    [HttpGet("{id:int}")]
    [Authorize(Roles = RolesLectura)]
    public async Task<ActionResult<DetallePlantillaContratoDto>> Obtener(int id, [FromQuery] int? version) =>
        Ok(await flujo.ObtenerAsync(id, version));

    [HttpPost]
    [Authorize(Roles = RolAdministrador)]
    public async Task<ActionResult<DetallePlantillaContratoDto>> Registrar([FromBody] GuardarPlantillaContratoDto dto) =>
        Ok(await flujo.RegistrarAsync(dto, User.ObtenerIdUsuario()));

    [HttpPut("{id:int}")]
    [Authorize(Roles = RolAdministrador)]
    public async Task<ActionResult<DetallePlantillaContratoDto>> Editar(int id, [FromBody] GuardarPlantillaContratoDto dto) =>
        Ok(await flujo.EditarAsync(id, dto, User.ObtenerIdUsuario()));

    [HttpPatch("{id:int}/estado")]
    [Authorize(Roles = RolAdministrador)]
    public async Task<ActionResult<ResultadoPlantillaContratoDto>> CambiarEstado(int id, [FromBody] CambiarEstadoPlantillaDto dto) =>
        Ok(await flujo.CambiarEstadoAsync(id, dto, User.ObtenerIdUsuario()));
}
