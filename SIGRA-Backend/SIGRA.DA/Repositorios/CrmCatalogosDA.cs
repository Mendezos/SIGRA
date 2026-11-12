using Dapper;
using System.Data;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.DA.Repositorios;

public class CrmCatalogosDA(IConexionFactory factory) : ICrmCatalogosDA
{
    public async Task<List<CrmEmpresaDto>> ListarEmpresasAsync(string? texto, string? tipo, bool soloActivas)
    {
        using var c = factory.CrearConexion();
        return (await c.QueryAsync<CrmEmpresaDto>("sp_CrmEmpresa_Listar",
            new { Texto = texto, Tipo = tipo, SoloActivas = soloActivas }, commandType: CommandType.StoredProcedure)).ToList();
    }

    public async Task<CrmEmpresaBasicaDto?> ObtenerEmpresaAsync(string tipo, int idEmpresa)
    {
        using var c = factory.CrearConexion();
        return await c.QueryFirstOrDefaultAsync<CrmEmpresaBasicaDto>("sp_CrmEmpresa_Obtener",
            new { Tipo = tipo, IdEmpresa = idEmpresa }, commandType: CommandType.StoredProcedure);
    }

    public async Task<List<CrmContactoCatalogoDto>> ListarContactosAsync(string tipo, int idEmpresa, bool soloActivos)
    {
        using var c = factory.CrearConexion();
        return (await c.QueryAsync<CrmContactoCatalogoDto>("sp_CrmContactoEmpresa_Catalogo",
            new { Tipo = tipo, IdEmpresa = idEmpresa, SoloActivos = soloActivos }, commandType: CommandType.StoredProcedure)).ToList();
    }

    public async Task<List<VendedorDto>> ListarVendedoresAsync()
    {
        using var c = factory.CrearConexion();
        return (await c.QueryAsync<VendedorDto>("sp_Vendedor_Listar", commandType: CommandType.StoredProcedure)).ToList();
    }
}
