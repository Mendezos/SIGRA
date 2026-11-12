using Dapper;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.DA.Repositorios;

public class NotaCreditoDA(IConexionFactory factory) : INotaCreditoDA
{
    public async Task<NotaCreditoDto> RegistrarAsync(NotaCreditoDto nota)
    {
        using var connection = factory.CrearConexion();
        var numero = $"NC-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
        var id = await connection.ExecuteScalarAsync<int>(
            """
            INSERT INTO dbo.NotaCredito
                (NumeroNota, IdFactura, Fecha, Monto, Motivo, IdUsuarioRegistra)
            OUTPUT INSERTED.IdNotaCredito
            VALUES (@numero, @IdFactura, @Fecha, @Monto, @Motivo, @IdUsuario)
            """,
            new
            {
                numero,
                nota.IdFactura,
                Fecha = nota.FechaEmision,
                nota.Monto,
                nota.Motivo,
                nota.IdUsuario
            });
        nota.IdNotaCredito = id;
        nota.Numero = numero;
        return nota;
    }

    public async Task<List<NotaCreditoDto>> ListarAsync()
    {
        using var connection = factory.CrearConexion();
        return (await connection.QueryAsync<NotaCreditoDto>(
            """
            SELECT n.IdNotaCredito, n.NumeroNota AS Numero, n.IdFactura,
                   f.NumeroFactura AS Factura, c.Empresa AS Cliente,
                   n.Fecha AS FechaEmision, n.Motivo, n.Monto, n.Estado,
                   f.Tipo AS FacturaTipo, f.Fecha AS FacturaFechaEmision,
                   f.Moneda AS FacturaMoneda, f.Total AS FacturaTotal,
                   f.Estado AS FacturaEstado,
                   CASE WHEN f.EstadoCobro = 'Vencida' THEN 'Irregular' ELSE f.EstadoCobro END AS FacturaEstadoCobro,
                   CASE WHEN f.EstadoCobro IN ('Parcial', 'Vencida') THEN (
                       SELECT TOP 1 cf.Monto FROM dbo.CobroFactura cf
                       WHERE cf.IdFactura = f.IdFactura AND cf.Monto IS NOT NULL
                       ORDER BY cf.IdCobro DESC
                   ) END AS FacturaMontoPendiente,
                   ISNULL(u.Nombre, '') AS UsuarioRegistra, n.FechaRegistro
            FROM dbo.NotaCredito n
            INNER JOIN dbo.Factura f ON f.IdFactura = n.IdFactura
            INNER JOIN dbo.Cliente c ON c.IdCliente = f.IdCliente
            LEFT JOIN dbo.Usuario u ON u.IdUsuario = n.IdUsuarioRegistra
            ORDER BY n.Fecha DESC, n.IdNotaCredito DESC
            """)).ToList();
    }
}
