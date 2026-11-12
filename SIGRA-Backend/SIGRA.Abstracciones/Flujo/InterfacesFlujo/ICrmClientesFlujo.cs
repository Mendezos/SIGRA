using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

// CRMGPSC-019 a 021
public interface ICrmClientesFlujo
{
    Task<List<ClienteCrmDto>> ListarClientesAsync(string? texto, int? idVendedor, string? estado);
    Task<PerfilClienteDto> ObtenerPerfilAsync(int idCliente, int idUsuario);
    Task<ConvertirProspectoResultadoDto> ConvertirProspectoAsync(int idProspecto, ConvertirProspectoDto dto, int idUsuario);
    Task<AsignarResponsableResultadoDto> AsignarResponsableAsync(string tipo, int idEmpresa, AsignarResponsableDto dto, int idUsuario);
}
