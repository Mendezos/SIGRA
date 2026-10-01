using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.Flujo.Flujos;

public class ModuloFlujo : IModuloFlujo
{
    private readonly IModuloDA _moduloDA;

    public ModuloFlujo(IModuloDA moduloDA) => _moduloDA = moduloDA;

    public async Task<List<ModuloDto>> ListarAsync()
    {
        return await _moduloDA.ListarAsync();
    }
}
