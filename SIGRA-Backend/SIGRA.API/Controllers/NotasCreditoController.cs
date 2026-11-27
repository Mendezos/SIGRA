using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;
using SIGRA.API.Filters;

namespace SIGRA.API.Controllers;

// Módulo 7 (Contratos y facturación): se exige el permiso del rol (GET lectura, POST escritura, PUT/PATCH edición).
[ApiController]
[PermisoModulo(7)]
[Route("api/notas-credito")]
public class NotasCreditoController(INotaCreditoFlujo flujo) : ControllerBase
{
    [HttpPost]
    public Task<NotaCreditoDto> Registrar(RegistrarNotaCreditoDto dto) =>
        flujo.RegistrarAsync(dto, User.ObtenerIdUsuario());

    [HttpGet]
    public Task<List<NotaCreditoDto>> Listar() => flujo.ListarAsync();
}
