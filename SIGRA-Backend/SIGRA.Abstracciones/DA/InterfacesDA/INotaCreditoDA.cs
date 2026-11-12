using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface INotaCreditoDA
{
    Task<NotaCreditoDto> RegistrarAsync(NotaCreditoDto nota);
    Task<List<NotaCreditoDto>> ListarAsync();
}
