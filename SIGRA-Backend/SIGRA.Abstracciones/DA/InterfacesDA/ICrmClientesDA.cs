using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

// CRMGPSC-019 a 021
public interface ICrmClientesDA
{
    Task<List<ClienteCrmDto>> ListarClientesAsync(string? texto, int? idVendedor, string? estado);
    Task<PerfilClienteDto?> ObtenerPerfilAsync(int idCliente, int idUsuario);
    Task<int> ConvertirProspectoAsync(int idProspecto, int? idClienteExistente, string producto, int cantidad, decimal monto, string moneda, DateTime fecha, int idUsuario);
    Task<AsignarResponsableResultadoDto> AsignarResponsableAsync(string tipo, int idEmpresa, int idVendedor, string? motivo, int idUsuario);
}
