CREATE PROCEDURE sp_Contrato_Listar
    @Texto       VARCHAR(150) = NULL,
    @Estado      VARCHAR(30) = NULL,
    @Moneda      CHAR(3) = NULL,
    @IdCategoria INT = NULL,          -- tipo de equipo (categoría) que incluye el contrato
    @VenceDesde  DATE = NULL,
    @VenceHasta  DATE = NULL,
    @IdVendedor  INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT x.*
    FROM (
        SELECT c.IdContrato, cl.Empresa, c.Estado AS EstadoRegistrado, CASE
        WHEN c.Estado IN ('Activo', 'Renovado') AND c.FechaVencimiento < CAST(GETDATE() AS DATE)
             AND NOT (c.Estado = 'Renovado' AND EXISTS (SELECT 1 FROM Contrato s WHERE s.IdContratoOrigen = c.IdContrato)) THEN 'Vencido'
        WHEN c.Estado = 'Activo' AND c.FechaVencimiento <= DATEADD(DAY, 30, CAST(GETDATE() AS DATE)) THEN N'Por vencer (30 días)'
        WHEN c.Estado = 'Activo' AND c.FechaVencimiento <= DATEADD(DAY, 90, CAST(GETDATE() AS DATE)) THEN N'Por vencer (90 días)'
        ELSE c.Estado
    END AS Estado,
           c.FechaInicio, c.FechaVencimiento, c.MontoMensual, c.Moneda, c.Condiciones, c.CubreReparaciones, c.IdVendedor, v.Nombre AS Vendedor,
           c.MotivoCancelacion, c.FechaCancelacion, c.IdPlantilla, c.VersionPlantilla, p.Nombre AS PlantillaNombre, c.FechaFirma,
           c.ClausulasAdicionales, c.Responsabilidades, c.Penalizacion, c.IdContratoOrigen,
           (SELECT TOP 1 s.IdContrato FROM Contrato s WHERE s.IdContratoOrigen = c.IdContrato ORDER BY s.IdContrato DESC) AS IdContratoSucesor,
           c.PenalizacionMonto, c.PenalizacionJustificacion, c.ObservacionesCancelacion,
           cl.Contacto, cl.Telefono, cl.Correo, cl.Direccion,
           CAST(CASE WHEN EXISTS (SELECT 1 FROM ContratoDocumento d WHERE d.IdContrato = c.IdContrato) THEN 1 ELSE 0 END AS BIT) AS TieneDocumento,
               (SELECT COUNT(*) FROM ContratoEquipo ce WHERE ce.IdContrato = c.IdContrato AND ce.FechaDevolucion IS NULL)
               + (SELECT COUNT(*) FROM ContratoEquipoBorrador b WHERE b.IdContrato = c.IdContrato) AS CantidadEquipos,
               ISNULL((SELECT STRING_AGG(q.NumeroSerie, ', ') FROM (
                           SELECT e.NumeroSerie FROM ContratoEquipo ce INNER JOIN Equipo e ON e.IdEquipo = ce.IdEquipo
                           WHERE ce.IdContrato = c.IdContrato AND ce.FechaDevolucion IS NULL
                           UNION ALL
                           SELECT e.NumeroSerie FROM ContratoEquipoBorrador b INNER JOIN Equipo e ON e.IdEquipo = b.IdEquipo
                           WHERE b.IdContrato = c.IdContrato) q), '') AS Series
        FROM Contrato c
        INNER JOIN Cliente cl ON cl.IdCliente = c.IdCliente
        LEFT JOIN Usuario v ON v.IdUsuario = c.IdVendedor
        LEFT JOIN PlantillaContrato p ON p.IdPlantilla = c.IdPlantilla
    ) x
    WHERE (@Estado IS NULL OR x.Estado = @Estado)
      AND (@Moneda IS NULL OR x.Moneda = @Moneda)
      AND (@IdVendedor IS NULL OR x.IdVendedor = @IdVendedor)
      AND (@VenceDesde IS NULL OR x.FechaVencimiento >= @VenceDesde)
      AND (@VenceHasta IS NULL OR x.FechaVencimiento <= @VenceHasta)
      AND (@IdCategoria IS NULL OR EXISTS (
            SELECT 1 FROM (SELECT ce.IdEquipo FROM ContratoEquipo ce WHERE ce.IdContrato = x.IdContrato
                           UNION SELECT b.IdEquipo FROM ContratoEquipoBorrador b WHERE b.IdContrato = x.IdContrato) q
            INNER JOIN Equipo e ON e.IdEquipo = q.IdEquipo
            INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
            WHERE m.IdCategoria = @IdCategoria))
      AND (@Texto IS NULL OR x.Empresa LIKE '%' + @Texto + '%'
           OR 'CT-' + RIGHT('0000' + CAST(x.IdContrato AS VARCHAR(10)), 4) LIKE '%' + @Texto + '%'
           OR x.Series LIKE '%' + @Texto + '%')
    ORDER BY CASE WHEN @Estado LIKE 'Por vencer%' THEN x.FechaVencimiento END ASC, x.IdContrato DESC;
END
