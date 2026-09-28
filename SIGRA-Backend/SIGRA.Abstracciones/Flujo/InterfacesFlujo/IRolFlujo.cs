using SIGRA.Abstracciones.Modelos;

namespace SIGRA.Abstracciones.Flujo;

public interface IRolFlujo
{
    Task<RolModel> CrearAsync(string nombre, int idUsuarioAdministrador);
}
