CREATE PROCEDURE sp_Frecuencia_ResumenDashboard
AS
BEGIN
    SET NOCOUNT ON;

    SELECT (SELECT COUNT(*) FROM SolicitudFrecuencia WHERE Estado = 'Vigente') AS Vigentes,
           (SELECT COUNT(*) FROM SolicitudFrecuencia WHERE Estado = 'Por renovar') AS PorRenovar,
           (SELECT COUNT(*) FROM SolicitudFrecuencia WHERE Estado = 'En renovación') AS EnRenovacion,
           (SELECT COUNT(*) FROM SolicitudFrecuencia WHERE Estado = 'Vencida') AS VencidasSinRenovacion,
           (SELECT COUNT(*) FROM AlertaFrecuencia WHERE Atendida = 0) AS AlertasPendientes,
           (SELECT COUNT(*) FROM AlertaFrecuencia a INNER JOIN SolicitudFrecuencia s ON s.IdSolicitud = a.IdSolicitud
            WHERE a.Tipo = 'Final' AND s.Estado = 'Por renovar') AS Urgentes;

    -- Frecuencias en alerta final (urgentes) que siguen sin renovarse: se resaltan en el dashboard.
    SELECT a.IdAlerta, a.IdSolicitud, c.Empresa, e.NumeroSerie, s.Frecuencia, a.FechaVencimiento,
           DATEDIFF(DAY, CAST(GETDATE() AS DATE), a.FechaVencimiento) AS DiasRestantes,
           v.Nombre AS Vendedor, a.Atendida
    FROM AlertaFrecuencia a
    INNER JOIN SolicitudFrecuencia s ON s.IdSolicitud = a.IdSolicitud
    INNER JOIN Cliente c ON c.IdCliente = s.IdCliente
    INNER JOIN Equipo e ON e.IdEquipo = s.IdEquipo
    INNER JOIN Usuario v ON v.IdUsuario = a.IdVendedor
    WHERE a.Tipo = 'Final' AND s.Estado = 'Por renovar'
    ORDER BY a.FechaVencimiento;
END
