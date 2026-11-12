using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface ICrmCatalogosDA
{
    Task<List<CrmEmpresaDto>> ListarEmpresasAsync(string? texto, string? tipo, bool soloActivas);
    Task<CrmEmpresaBasicaDto?> ObtenerEmpresaAsync(string tipo, int idEmpresa);
    Task<List<CrmContactoCatalogoDto>> ListarContactosAsync(string tipo, int idEmpresa, bool soloActivos);
    Task<List<VendedorDto>> ListarVendedoresAsync();
}
