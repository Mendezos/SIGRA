using SIGRA.Abstracciones.Modelos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface IRolDA
{
    Task<bool> ExisteConNombreAsync(string nombre);
    Task<RolModel> CrearAsync(string nombre);
    Task<List<RolModel>> ListarAsync();
}
