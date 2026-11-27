using System.Data;
using Dapper;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.DA.Repositorios;

// DAR: indicadores del dashboard
public class DashboardDA(IConexionFactory factory) : IDashboardDA
{
    public async Task<DashboardInventarioDto> ObtenerInventarioAsync(int? idCategoria, int? idModelo, DateTime? desde, DateTime? hasta)
    {
        using var c = factory.CrearConexion();
        using var r = await c.QueryMultipleAsync("sp_Dashboard_Inventario",
            new { IdCategoria = idCategoria, IdModelo = idModelo, Desde = desde?.Date, Hasta = hasta?.Date },
            commandType: CommandType.StoredProcedure);
        return new DashboardInventarioDto
        {
            Indicadores = await r.ReadFirstAsync<IndicadoresInventarioDto>(),
            PorCategoria = (await r.ReadAsync<CategoriaInventarioDto>()).ToList(),
            Evolucion = (await r.ReadAsync<EvolucionInventarioDto>()).ToList(),
            Stock = (await r.ReadAsync<StockMinimoDashboardDto>()).ToList(),
            Baterias = (await r.ReadAsync<BateriaPorCambiarDto>()).ToList(),
            Modelos = (await r.ReadAsync<ModeloFiltroDto>()).ToList(),
        };
    }

    public async Task<DashboardTallerDto> ObtenerTallerAsync(int? idTecnico, string? tipoServicio, DateTime? desde, DateTime? hasta)
    {
        using var c = factory.CrearConexion();
        using var r = await c.QueryMultipleAsync("sp_Dashboard_Taller",
            new { IdTecnico = idTecnico, TipoServicio = tipoServicio, Desde = desde?.Date, Hasta = hasta?.Date },
            commandType: CommandType.StoredProcedure);
        return new DashboardTallerDto
        {
            Abiertas = (await r.ReadAsync<AbiertasPorTipoDto>()).ToList(),
            Reparaciones = (await r.ReadAsync<ReparacionAbiertaDto>()).ToList(),
            Ranking = (await r.ReadAsync<RankingTecnicoDto>()).ToList(),
            Solicitudes = (await r.ReadAsync<SolicitudPendienteDto>()).ToList(),
            CerradasPorMes = (await r.ReadAsync<CerradasMesDto>()).ToList(),
            Resoluciones = (await r.ReadAsync<BoletaResueltaDto>()).ToList(),
            Carga = (await r.ReadAsync<CargaTecnicoDto>()).ToList(),
        };
    }
}
