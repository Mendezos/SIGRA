using System.Data;
using Dapper;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.DA.Repositorios;

public class FacturaDA(IConexionFactory factory) : IFacturaDA
{
    public async Task<FacturaDto> RegistrarAsync(FacturaDto factura)
    {
        using var connection = factory.CrearConexion();
        connection.Open();
        using var transaction = connection.BeginTransaction();
        var cliente = await connection.QuerySingleOrDefaultAsync<(int IdCliente, string Empresa, string? Correo)>(
            """
            SELECT TOP 1 IdCliente, Empresa, Correo FROM dbo.Cliente
            WHERE Activo = 1 AND (Empresa = @Cliente OR CONVERT(varchar(20), IdCliente) = @Cliente)
            """, new { factura.Cliente }, transaction);
        if (cliente.IdCliente == 0)
            throw new ReglaNegocioException("El cliente seleccionado no existe o está inactivo.");

        var numero = $"FA-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
        var id = await connection.ExecuteScalarAsync<int>(
            """
            INSERT INTO dbo.Factura
                (NumeroFactura, Tipo, IdCliente, Fecha, Moneda, Subtotal, Impuesto, Total, IdUsuarioRegistra)
            OUTPUT INSERTED.IdFactura
            VALUES (@numero, @Tipo, @IdCliente, @Fecha, 'CRC', @Subtotal, @Impuesto, @Total, @IdUsuario)
            """,
            new
            {
                numero,
                factura.Tipo,
                IdCliente = cliente.IdCliente,
                Fecha = factura.FechaEmision,
                factura.Subtotal,
                factura.Impuesto,
                factura.Total
                ,factura.IdUsuario
            }, transaction);
        await connection.ExecuteAsync(
            """
            INSERT INTO dbo.FacturaLinea (IdFactura, Descripcion, Cantidad, PrecioUnitario)
            VALUES (@id, @Descripcion, @Cantidad, @PrecioUnitario)
            """,
            factura.Lineas.Select(linea => new
            {
                id,
                linea.Descripcion,
                linea.Cantidad,
                linea.PrecioUnitario
            }), transaction);
        transaction.Commit();
        factura.IdFactura = id;
        factura.Numero = numero;
        factura.Cliente = cliente.Empresa;
        factura.CorreoCliente = cliente.Correo ?? string.Empty;
        return factura;
    }

    public async Task<List<FacturaDto>> ListarAsync()
    {
        using var connection = factory.CrearConexion();
        var facturas = (await connection.QueryAsync<FacturaDto>(
            """
            SELECT f.IdFactura, f.NumeroFactura AS Numero, c.Empresa AS Cliente,
                   c.Correo AS CorreoCliente, f.Tipo, f.Fecha AS FechaEmision,
                   f.Subtotal, f.Impuesto, f.Total,
                   CASE WHEN f.EstadoCobro = 'Vencida' THEN 'Irregular' ELSE f.EstadoCobro END AS EstadoCobro
            FROM dbo.Factura f
            INNER JOIN dbo.Cliente c ON c.IdCliente = f.IdCliente
            ORDER BY f.Fecha DESC, f.IdFactura DESC
            """)).ToList();
        foreach (var factura in facturas)
            factura.Lineas = (await connection.QueryAsync<LineaFacturaDto>(
                "SELECT Descripcion, Cantidad, PrecioUnitario FROM dbo.FacturaLinea WHERE IdFactura = @id ORDER BY IdLinea",
                new { id = factura.IdFactura })).ToList();
        return facturas;
    }

    public async Task<FacturaDto?> CambiarEstadoCobroAsync(int idFactura, string estadoCobro)
    {
        using var connection = factory.CrearConexion();
        connection.Open();
        using var transaction = connection.BeginTransaction();
        var estadoSql = estadoCobro == "Irregular" ? "Vencida" : estadoCobro;
        var updated = await connection.ExecuteAsync(
            "UPDATE dbo.Factura SET EstadoCobro = @estadoSql WHERE IdFactura = @idFactura",
            new { idFactura, estadoSql }, transaction);
        if (updated == 0) return null;
        await connection.ExecuteAsync(
            """
            INSERT INTO dbo.CobroFactura (IdFactura, EstadoCobro, IdUsuario)
            VALUES (@idFactura, @estadoSql, @idUsuario)
            """, new { idFactura, estadoSql, idUsuario = 1 }, transaction);
        transaction.Commit();
        return (await ListarAsync()).Single(factura => factura.IdFactura == idFactura);
    }

    public async Task GuardarDetalleCobroAsync(int idFactura, CambiarEstadoCobroDto dto, int idUsuario)
    {
        using var connection = factory.CrearConexion();
        await connection.ExecuteAsync(
            """
            UPDATE CobroFactura
            SET Monto = @Monto, FechaCobro = COALESCE(@FechaCobro, FechaCobro),
                MedioPago = @MedioPago, Referencia = @Referencia, Observacion = @Observacion,
                IdUsuario = @IdUsuario
            WHERE IdCobro = (
                SELECT TOP 1 IdCobro FROM CobroFactura
                WHERE IdFactura = @IdFactura ORDER BY IdCobro DESC
            )
            """,
            new
            {
                idFactura,
                Monto = dto.MontoPendiente,
                FechaCobro = dto.FechaPago,
                MedioPago = string.IsNullOrWhiteSpace(dto.MetodoPago) ? null : dto.MetodoPago.Trim(),
                Referencia = string.IsNullOrWhiteSpace(dto.ReferenciaPago) ? null : dto.ReferenciaPago.Trim(),
                Observacion = string.IsNullOrWhiteSpace(dto.Observacion) ? null : dto.Observacion.Trim(),
                IdUsuario = idUsuario
            });
    }
}
