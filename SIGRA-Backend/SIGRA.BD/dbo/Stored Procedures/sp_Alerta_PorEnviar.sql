CREATE PROCEDURE sp_Alerta_PorEnviar
    @MaxIntentos INT = 5
AS
BEGIN
    SET NOCOUNT ON;

    -- No se envían alertas ya cerradas (atendidas o detenidas por una cancelación) ni de solicitudes canceladas.
    SELECT a.IdAlerta, a.IdSolicitud, a.Tipo, a.FechaVencimiento,
           DATEDIFF(DAY, CAST(GETDATE() AS DATE), a.FechaVencimiento) AS DiasRestantes,
           c.Empresa, e.NumeroSerie, s.Frecuencia, s.Banda,
           v.Nombre AS Vendedor, v.Correo AS CorreoVendedor
    FROM AlertaFrecuencia a
    INNER JOIN SolicitudFrecuencia s ON s.IdSolicitud = a.IdSolicitud
    INNER JOIN Cliente c ON c.IdCliente = s.IdCliente
    INNER JOIN Equipo e ON e.IdEquipo = s.IdEquipo
    INNER JOIN Usuario v ON v.IdUsuario = a.IdVendedor
    WHERE a.CorreoEnviado = 0 AND a.IntentosEnvio < @MaxIntentos
      AND a.Atendida = 0 AND s.Estado <> 'Cancelada'
    ORDER BY a.IdAlerta;
END
