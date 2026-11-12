using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.Flujo.Flujos;

public class CrmCatalogosFlujo(ICrmCatalogosDA da) : ICrmCatalogosFlujo
{
    public Task<List<CrmEmpresaDto>> ListarEmpresasAsync(string? texto, string? tipo, bool soloActivas)
    {
        tipo = string.IsNullOrWhiteSpace(tipo) ? null : tipo.Trim();
        if (tipo is not null && !CrmCatalogos.TiposEmpresa.Contains(tipo))
            throw new ReglaNegocioException("El tipo de empresa debe ser Prospecto o Cliente.");
        texto = string.IsNullOrWhiteSpace(texto) ? null : texto.Trim();
        return da.ListarEmpresasAsync(texto, tipo, soloActivas);
    }

    public async Task<List<CrmContactoCatalogoDto>> ListarContactosAsync(string tipo, int idEmpresa, bool soloActivos)
    {
        if (!CrmCatalogos.TiposEmpresa.Contains(tipo))
            throw new ReglaNegocioException("El tipo de empresa debe ser Prospecto o Cliente.");
        if (await da.ObtenerEmpresaAsync(tipo, idEmpresa) is null)
            throw new ReglaNegocioException("La empresa indicada no existe.");
        return await da.ListarContactosAsync(tipo, idEmpresa, soloActivos);
    }

    public Task<List<VendedorDto>> ListarVendedoresAsync() => da.ListarVendedoresAsync();
}
