using Dapper;
using Microsoft.Data.SqlClient;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using System.Data;

namespace SIGRA.DA.Repositorios;

public class GestionCuentasDA : IGestionCuentasDA
{
    private readonly IConexionFactory _conexion;

    public GestionCuentasDA(IConexionFactory conexion) => _conexion = conexion;

    private async Task<List<T>> Consultar<T>(string sp, object? parametros = null)
    {
        using var cn = _conexion.CrearConexion();

        var filas = await cn.QueryAsync<T>(
            sp, parametros, commandType: CommandType.StoredProcedure);

        return filas.ToList();
    }

    public Task<List<CuentaDto>> ListarAsync(FiltroCuentasDto filtro) =>
        Consultar<CuentaDto>("dbo.sp_Cuenta_Listar", filtro);

    public Task<List<RolCuentaDto>> RolesAsync() =>
        Consultar<RolCuentaDto>("dbo.sp_Cuenta_Roles");

    public Task<List<RegistroAuditoriaDto>> AuditoriaAsync(FiltroAuditoriaDto filtro) =>
        Consultar<RegistroAuditoriaDto>("dbo.sp_Auditoria_Consultar", filtro);

    public async Task<int> GuardarAsync(CambioCuenta cambio)
    {
        using var cn = _conexion.CrearConexion();

        try
        {
            return await cn.QuerySingleAsync<int>(
                "dbo.sp_Cuenta_Guardar",
                cambio,
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex) when (ex.Number is 2601 or 2627)
        {
            throw new ReglaNegocioException(
                "Ya existe una cuenta con esa cédula o correo.");
        }
        catch (SqlException ex) when (ex.Number == 50001)
        {
            throw new ReglaNegocioException(ex.Message);
        }
    }
}