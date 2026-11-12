using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.API.Extensions;

namespace SIGRA.API.Controllers;

[ApiController]
[Route("api/notas-credito")]
public class NotasCreditoController(INotaCreditoFlujo flujo) : ControllerBase
{
    [HttpPost]
    public Task<NotaCreditoDto> Registrar(RegistrarNotaCreditoDto dto) =>
        flujo.RegistrarAsync(dto, User.ObtenerIdUsuario());

    [HttpGet]
    public Task<List<NotaCreditoDto>> Listar() => flujo.ListarAsync();
}
