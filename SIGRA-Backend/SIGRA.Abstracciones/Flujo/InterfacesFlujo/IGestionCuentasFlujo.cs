using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

public interface IGestionCuentasFlujo
{
    Task<List<CuentaDto>> ListarAsync(FiltroCuentasDto filtro);

    Task<int> CrearAsync(CrearCuentaDto cuenta, int idAutor);

    Task CambiarEstadoAsync(
        int idUsuario,
        CambiarEstadoCuentaDto dto,
        int idAutor);

    Task EditarAsync(
        int idUsuario,
        DatosCuentaDto dto,
        int idAutor);

    Task CambiarRolAsync(
        int idUsuario,
        CambiarRolCuentaDto dto,
        int idAutor);

    Task<List<RolCuentaDto>> RolesAsync();

    Task<List<RegistroAuditoriaDto>> AuditoriaAsync(
        FiltroAuditoriaDto filtro);
}