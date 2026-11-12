using Dapper;
using Microsoft.Data.SqlClient;
using System.Data;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.DA.Repositorios;

// CRMGPSC-013 y 014: notas, interacciones e historial comercial
public class CrmInteraccionesDA(IConexionFactory factory) : ICrmInteraccionesDA
{
    // Los SP lanzan THROW 50001 cuando una regla de negocio falla (por ejemplo, empresa descartada o fecha futura).
    private const int CodigoReglaNegocio = 50001;

    public async Task<InteraccionRegistradaDto> RegistrarInteraccionAsync(string tipoEmpresa, int idEmpresa, int idUsuario, string tipo, DateTime fecha,
        string descripcion, string? resultado, string? proximoPaso, int? idContactoEmpresa, int? idCotizacion)
    {
        using var c = factory.CrearConexion();
        try
        {
            return await c.QueryFirstAsync<InteraccionRegistradaDto>("sp_CrmInteraccion_Registrar", new
            {
                TipoEmpresa = tipoEmpresa,
                IdEmpresa = idEmpresa,
                IdUsuario = idUsuario,
                Tipo = tipo,
                Fecha = fecha,
                Detalle = descripcion,
                Resultado = resultado,
                ProximoPaso = proximoPaso,
                IdContactoEmpresa = idContactoEmpresa,
                IdCotizacion = idCotizacion
            }, commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex) when (ex.Number == CodigoReglaNegocio)
        {
            throw new ReglaNegocioException(ex.Message);
        }
    }

    public async Task<NotaRegistradaDto> RegistrarNotaAsync(string tipoEmpresa, int idEmpresa, int idUsuario, string categoria, string texto, string visibilidad)
    {
        using var c = factory.CrearConexion();
        try
        {
            return await c.QueryFirstAsync<NotaRegistradaDto>("sp_CrmNota_Registrar", new
            {
                TipoEmpresa = tipoEmpresa,
                IdEmpresa = idEmpresa,
                IdUsuario = idUsuario,
                Categoria = categoria,
                Texto = texto,
                Visibilidad = visibilidad
            }, commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex) when (ex.Number == CodigoReglaNegocio)
        {
            throw new ReglaNegocioException(ex.Message);
        }
    }

    public async Task<List<CrmCotizacionEmpresaDto>> ListarCotizacionesAsync(string tipoEmpresa, int idEmpresa)
    {
        using var c = factory.CrearConexion();
        return (await c.QueryAsync<CrmCotizacionEmpresaDto>("sp_CrmInteraccion_Cotizaciones",
            new { TipoEmpresa = tipoEmpresa, IdEmpresa = idEmpresa }, commandType: CommandType.StoredProcedure)).ToList();
    }

    public async Task<HistorialComercialDto> ListarHistorialAsync(string tipoEmpresa, int idEmpresa, int idUsuario, string? tipoMovimiento,
        DateTime? desde, DateTime? hasta, int? idAutor)
    {
        using var c = factory.CrearConexion();
        try
        {
            using var multiple = await c.QueryMultipleAsync("sp_CrmHistorial_Listar", new
            {
                TipoEmpresa = tipoEmpresa,
                IdEmpresa = idEmpresa,
                IdUsuario = idUsuario,
                TipoMovimiento = tipoMovimiento,
                FechaDesde = desde?.Date,
                FechaHasta = hasta?.Date,
                IdAutor = idAutor
            }, commandType: CommandType.StoredProcedure);

            return new HistorialComercialDto
            {
                TipoEmpresa = tipoEmpresa,
                IdEmpresa = idEmpresa,
                Movimientos = (await multiple.ReadAsync<HistorialMovimientoDto>()).ToList(),
                Autores = (await multiple.ReadAsync<HistorialAutorDto>()).ToList(),
                TotalSinFiltros = await multiple.ReadFirstAsync<int>()
            };
        }
        catch (SqlException ex) when (ex.Number == CodigoReglaNegocio)
        {
            throw new ReglaNegocioException(ex.Message);
        }
    }
}
