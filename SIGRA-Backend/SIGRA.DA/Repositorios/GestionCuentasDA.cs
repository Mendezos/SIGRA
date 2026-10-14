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

    // Los SP paginados devuelven dos conjuntos: los datos de paginación y la página pedida.
    private async Task<PaginaDto<T>> ConsultarPagina<T>(string sp, object parametros)
    {
        using var cn = _conexion.CrearConexion();

        try
        {
            using var multiple = await cn.QueryMultipleAsync(
                sp, parametros, commandType: CommandType.StoredProcedure);

            var datos = await multiple.ReadSingleAsync<DatosPagina>();
            var items = (await multiple.ReadAsync<T>()).ToList();

            return new PaginaDto<T>
            {
                Items = items,
                Total = datos.Total,
                Pagina = datos.Pagina,
                TamanoPagina = datos.TamanoPagina
            };
        }
        catch (SqlException ex) when (ex.Number == 50001)
        {
            throw new ReglaNegocioException(ex.Message);
        }
    }

    private sealed class DatosPagina
    {
        public int Total { get; set; }
        public int Pagina { get; set; }
        public int TamanoPagina { get; set; }
    }

    public Task<PaginaDto<CuentaDto>> ListarAsync(FiltroCuentasDto filtro) =>
        ConsultarPagina<CuentaDto>("dbo.sp_Cuenta_Listar", filtro);

    public Task<List<RolCuentaDto>> RolesAsync() =>
        Consultar<RolCuentaDto>("dbo.sp_Cuenta_Roles");

    public Task<PaginaDto<RegistroAuditoriaDto>> AuditoriaAsync(FiltroAuditoriaDto filtro) =>
        ConsultarPagina<RegistroAuditoriaDto>("dbo.sp_Auditoria_Consultar", filtro);

    public async Task<ResumenCuentasDto> ResumenAsync()
    {
        using var cn = _conexion.CrearConexion();

        return await cn.QuerySingleAsync<ResumenCuentasDto>(
            "dbo.sp_Cuenta_Resumen", commandType: CommandType.StoredProcedure);
    }

    public Task<List<OpcionCuentaDto>> OpcionesAsync() =>
        Consultar<OpcionCuentaDto>("dbo.sp_Cuenta_Opciones");

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
