using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

public interface ICrmCatalogosFlujo
{
    Task<List<CrmEmpresaDto>> ListarEmpresasAsync(string? texto, string? tipo, bool soloActivas);
    Task<List<CrmContactoCatalogoDto>> ListarContactosAsync(string tipo, int idEmpresa, bool soloActivos);
    Task<List<VendedorDto>> ListarVendedoresAsync();
}
