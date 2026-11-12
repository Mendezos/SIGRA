using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.DA.Repositorios;

public class CotizacionDA(IConexionFactory factory) : ICotizacionDA
{
    public async Task<CotizacionDto> RegistrarAsync(CotizacionDto cotizacion)
    {
        using var connection = factory.CrearConexion();
        connection.Open();
        using var transaction = connection.BeginTransaction();
        try
        {
            var id = await connection.ExecuteScalarAsync<int>(
                """
                INSERT INTO dbo.Cotizacion
                    (IdProspecto, Fecha, Monto, Estado, IdCliente, IdVendedor, IdUsuarioCrea)
                OUTPUT INSERTED.IdCotizacion
                VALUES (@IdProspecto, @Fecha, @Monto, @Estado, @IdCliente, @IdVendedor, @IdUsuarioCrea)
                """,
                new
                {
                    IdProspecto = cotizacion.IdProspecto > 0 ? (int?)cotizacion.IdProspecto : null,
                    cotizacion.Fecha,
                    cotizacion.Monto,
                    Estado = cotizacion.Estado == "Anulada" ? "Rechazada" : cotizacion.Estado,
                    IdCliente = (int?)null,
                    IdVendedor = (int?)null,
                    IdUsuarioCrea = cotizacion.IdUsuario
                }, transaction);
            await InsertarLineasAsync(connection, transaction, id, cotizacion.Lineas);
            transaction.Commit();
            cotizacion.IdCotizacion = id;
            cotizacion.Activa = true;
            return cotizacion;
        }
        catch (SqlException ex)
        {
            transaction.Rollback();
            throw new ReglaNegocioException(ex.Message);
        }
    }

    public async Task<CotizacionDto?> ActualizarAsync(CotizacionDto cotizacion)
    {
        using var connection = factory.CrearConexion();
        connection.Open();
        using var transaction = connection.BeginTransaction();
        var updated = await connection.ExecuteAsync(
            """
            UPDATE dbo.Cotizacion
            SET IdProspecto = @IdProspecto, Fecha = @Fecha, Monto = @Monto, Version = Version + 1
            WHERE IdCotizacion = @IdCotizacion AND Estado = 'Borrador'
            """, cotizacion, transaction);
        if (updated == 0) return null;
        await connection.ExecuteAsync("DELETE FROM dbo.CotizacionLinea WHERE IdCotizacion = @IdCotizacion",
            new { cotizacion.IdCotizacion }, transaction);
        await InsertarLineasAsync(connection, transaction, cotizacion.IdCotizacion, cotizacion.Lineas);
        transaction.Commit();
        return cotizacion;
    }

    public Task<CotizacionDto?> CambiarEstadoAsync(int idCotizacion, string estado) =>
        ActualizarEstadoAsync(idCotizacion, estado switch
        {
            "Anulada" => "Rechazada",
            "Aprobada" => "Aceptada",
            _ => estado
        });

    public Task<CotizacionDto?> CambiarActivaAsync(int idCotizacion, bool activa) =>
        ActualizarEstadoAsync(idCotizacion, activa ? "Borrador" : "Inactiva");

    public async Task<CotizacionDto?> ObtenerAsync(int idCotizacion)
    {
        using var connection = factory.CrearConexion();
        var quote = await connection.QuerySingleOrDefaultAsync<CotizacionDto>(
            """
            SELECT IdCotizacion, ISNULL(IdProspecto, 0) AS IdProspecto, Fecha, Monto,
                   CASE WHEN Estado = 'Rechazada' THEN 'Anulada' ELSE Estado END AS Estado,
                   CAST(CASE WHEN Estado = 'Inactiva' THEN 0 ELSE 1 END AS bit) AS Activa
            FROM dbo.Cotizacion WHERE IdCotizacion = @idCotizacion
            """, new { idCotizacion });
        if (quote is null) return null;
        quote.Lineas = (await connection.QueryAsync<LineaCotizacionDto>(
            """
            SELECT Descripcion, Cantidad, PrecioUnitario
            FROM dbo.CotizacionLinea WHERE IdCotizacion = @idCotizacion ORDER BY IdLinea
            """, new { idCotizacion })).ToList();
        return quote;
    }

    public async Task<List<CotizacionDto>> ListarAsync()
    {
        using var connection = factory.CrearConexion();
        var quotes = (await connection.QueryAsync<CotizacionDto>(
            """
            SELECT IdCotizacion, ISNULL(IdProspecto, 0) AS IdProspecto, Fecha, Monto,
                   CASE WHEN Estado = 'Rechazada' THEN 'Anulada' ELSE Estado END AS Estado,
                   CAST(CASE WHEN Estado = 'Inactiva' THEN 0 ELSE 1 END AS bit) AS Activa
            FROM dbo.Cotizacion ORDER BY Fecha DESC, IdCotizacion DESC
            """)).ToList();
        foreach (var quote in quotes)
            quote.Lineas = (await connection.QueryAsync<LineaCotizacionDto>(
                "SELECT Descripcion, Cantidad, PrecioUnitario FROM dbo.CotizacionLinea WHERE IdCotizacion = @quoteId ORDER BY IdLinea",
                new { quoteId = quote.IdCotizacion })).ToList();
        return quotes;
    }

    private async Task<CotizacionDto?> ActualizarEstadoAsync(int idCotizacion, string estado)
    {
        using var connection = factory.CrearConexion();
        var updated = await connection.ExecuteAsync(
            "UPDATE dbo.Cotizacion SET Estado = @estado WHERE IdCotizacion = @idCotizacion",
            new { idCotizacion, estado });
        return updated == 0 ? null : await ObtenerAsync(idCotizacion);
    }

    private static Task<int> InsertarLineasAsync(
        IDbConnection connection,
        IDbTransaction transaction,
        int idCotizacion,
        IEnumerable<LineaCotizacionDto> lineas) =>
        connection.ExecuteAsync(
            """
            INSERT INTO dbo.CotizacionLinea (IdCotizacion, Descripcion, Cantidad, PrecioUnitario)
            VALUES (@idCotizacion, @Descripcion, @Cantidad, @PrecioUnitario)
            """,
            lineas.Select(linea => new
            {
                idCotizacion,
                linea.Descripcion,
                linea.Cantidad,
                linea.PrecioUnitario
            }), transaction);
}
