using System.Security.Cryptography;
using System.Text;
using Dapper;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.DA.Repositorios;

public class EncuestaDA(IConexionFactory factory) : IEncuestaDA
{
    public async Task<(EncuestaSatisfaccionDto Encuesta, string Token)> CrearAsync(
        FacturaDto factura,
        string correoCliente)
    {
        using var connection = factory.CrearConexion();
        var existente = await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(1) FROM dbo.Encuesta WHERE IdFactura = @facturaId AND Estado IN ('Pendiente', 'Enviada')",
            new { facturaId = factura.IdFactura });
        if (existente > 0)
            throw new ReglaNegocioException("La factura ya tiene una encuesta activa.");

        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        var tokenHash = HashToken(token);
        var id = await connection.ExecuteScalarAsync<int>(
            """
            INSERT INTO dbo.Encuesta
                (IdFactura, IdCliente, TokenHash, CorreoDestino, Estado, FechaEnvio, FechaExpiracion)
            SELECT @IdFactura, f.IdCliente, @TokenHash, @Correo, 'Enviada', SYSUTCDATETIME(), DATEADD(day, 15, SYSUTCDATETIME())
            FROM dbo.Factura f WHERE f.IdFactura = @IdFactura;
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """,
            new { factura.IdFactura, TokenHash = tokenHash, Correo = correoCliente });
        var encuesta = await ObtenerPorIdAsync(id)
            ?? throw new ReglaNegocioException("No se pudo crear la encuesta.");
        return (encuesta, token);
    }

    public async Task<List<EncuestaSatisfaccionDto>> ListarAsync()
    {
        using var connection = factory.CrearConexion();
        return (await connection.QueryAsync<EncuestaSatisfaccionDto>(ConsultaBase + " ORDER BY e.FechaCreacion DESC")).ToList();
    }

    public async Task<EncuestaSatisfaccionDto?> ObtenerPorIdAsync(int idEncuesta)
    {
        using var connection = factory.CrearConexion();
        return await connection.QuerySingleOrDefaultAsync<EncuestaSatisfaccionDto>(
            ConsultaBase + " WHERE e.IdEncuesta = @idEncuesta", new { idEncuesta });
    }

    public async Task<EncuestaSatisfaccionDto?> ObtenerPublicaAsync(string hashToken)
    {
        var token = HashToken(hashToken);
        if (token.Length == 0)
            return null;
        using var connection = factory.CrearConexion();
        return await connection.QuerySingleOrDefaultAsync<EncuestaSatisfaccionDto>(
            ConsultaBase + """
            
            WHERE e.TokenHash = @token AND e.Estado IN ('Pendiente', 'Enviada')
              AND e.FechaExpiracion > SYSUTCDATETIME()
            """, new { token });
    }

    public async Task<RespuestaEncuestaResultadoDto> ResponderAsync(
        string hashToken,
        ResponderEncuestaDto dto,
        int umbralBajaSatisfaccion)
    {
        var token = HashToken(hashToken);
        if (token.Length == 0)
            throw new ReglaNegocioException("El enlace no es válido, venció o ya fue utilizado.");
        using var connection = factory.CrearConexion();
        connection.Open();
        using var transaction = connection.BeginTransaction();
        var updated = await connection.ExecuteAsync(
            """
            UPDATE dbo.Encuesta
            SET Estado = 'Respondida', CalificacionGeneral = @Calificacion,
                Comentario = @Comentario, FechaRespuesta = SYSUTCDATETIME()
            WHERE TokenHash = @Token AND Estado IN ('Pendiente', 'Enviada')
              AND FechaExpiracion > SYSUTCDATETIME()
            """,
            new { Token = token, dto.Calificacion, Comentario = dto.Comentario.Trim() }, transaction);
        if (updated == 0)
            throw new ReglaNegocioException("El enlace no es válido, venció o ya fue utilizado.");
        transaction.Commit();
        var alerta = dto.Calificacion <= umbralBajaSatisfaccion;
        return new RespuestaEncuestaResultadoDto
        {
            Mensaje = alerta
                ? "Gracias por responder. Registramos una alerta para dar seguimiento a tu satisfacción."
                : "Gracias por responder la encuesta.",
            AlertaBajaSatisfaccion = alerta
        };
    }

    public async Task<(EncuestaSatisfaccionDto Encuesta, string Token)?> ReenviarAsync(int idEncuesta)
    {
        using var connection = factory.CrearConexion();
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        var tokenHash = HashToken(token);
        var updated = await connection.ExecuteAsync(
            """
            UPDATE dbo.Encuesta
            SET TokenHash = @TokenHash, Estado = 'Enviada', FechaEnvio = SYSUTCDATETIME(),
                FechaExpiracion = DATEADD(day, 15, SYSUTCDATETIME())
            WHERE IdEncuesta = @idEncuesta AND Estado <> 'Respondida'
            """, new { idEncuesta, TokenHash = tokenHash });
        if (updated == 0) return null;
        var encuesta = await ObtenerPorIdAsync(idEncuesta);
        return encuesta is null ? null : (encuesta, token);
    }

    public async Task<HistorialClienteFinancieroDto> ObtenerHistorialClienteAsync(int idCliente)
    {
        using var connection = factory.CrearConexion();
        using var resultados = await connection.QueryMultipleAsync(
            """
            SELECT IdContrato, Estado, FechaInicio, FechaVencimiento, MontoMensual, Moneda,
                   (SELECT COUNT(1) FROM ContratoEquipo ce WHERE ce.IdContrato = c.IdContrato) AS CantidadEquipos
            FROM Contrato c WHERE IdCliente = @idCliente ORDER BY FechaInicio DESC;

            SELECT IdFactura, NumeroFactura, Tipo, Fecha, Total, Moneda,
                   EstadoCobro AS EstadoCobro, EstadoCobro AS Estado
            FROM Factura WHERE IdCliente = @idCliente ORDER BY Fecha DESC;

            SELECT e.IdEncuesta, e.IdFactura, f.NumeroFactura,
                   COALESCE(e.FechaEnvio, e.FechaCreacion) AS FechaEnvio,
                   e.Estado, e.CalificacionGeneral AS Calificacion,
                   COALESCE(e.Comentario, '') AS Comentario
            FROM Encuesta e
            INNER JOIN Factura f ON f.IdFactura = e.IdFactura
            WHERE e.IdCliente = @idCliente
            ORDER BY e.FechaCreacion DESC;
            """, new { idCliente });
        return new HistorialClienteFinancieroDto
        {
            Contratos = (await resultados.ReadAsync<ContratoClienteDto>()).ToList(),
            Facturas = (await resultados.ReadAsync<FacturaClienteDto>()).ToList(),
            Encuestas = (await resultados.ReadAsync<EncuestaClienteHistorialDto>()).ToList()
        };
    }

    private static byte[] HashToken(string token) =>
        string.IsNullOrWhiteSpace(token)
            ? []
            : SHA256.HashData(Encoding.UTF8.GetBytes(token));

    private const string ConsultaBase = """
        SELECT e.IdEncuesta, e.IdFactura, f.NumeroFactura, c.Empresa AS Cliente,
               COALESCE(e.CorreoDestino, c.Correo, '') AS CorreoCliente,
               COALESCE(e.FechaEnvio, e.FechaCreacion) AS FechaEnvio,
               e.FechaExpiracion AS FechaVencimiento, e.Estado,
               e.CalificacionGeneral AS Calificacion, COALESCE(e.Comentario, '') AS Comentario,
               e.FechaRespuesta,
               CAST(CASE WHEN e.CalificacionGeneral IS NOT NULL AND e.CalificacionGeneral <= 3 THEN 1 ELSE 0 END AS bit) AS AlertaBajaSatisfaccion
        FROM dbo.Encuesta e
        INNER JOIN dbo.Factura f ON f.IdFactura = e.IdFactura
        INNER JOIN dbo.Cliente c ON c.IdCliente = e.IdCliente
        """;
}
