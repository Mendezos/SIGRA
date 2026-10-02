using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface IGestionCuentasDA
{
    Task<List<CuentaDto>> ListarAsync(FiltroCuentasDto filtro);
    Task<int> GuardarAsync(CambioCuenta cambio);
    Task<List<RolCuentaDto>> RolesAsync();
    Task<List<RegistroAuditoriaDto>> AuditoriaAsync(FiltroAuditoriaDto filtro);
}