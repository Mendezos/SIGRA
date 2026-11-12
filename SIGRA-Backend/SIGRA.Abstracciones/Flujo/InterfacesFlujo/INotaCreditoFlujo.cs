using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

public interface INotaCreditoFlujo
{
    Task<NotaCreditoDto> RegistrarAsync(RegistrarNotaCreditoDto dto, int idUsuario);
    Task<List<NotaCreditoDto>> ListarAsync();
}
