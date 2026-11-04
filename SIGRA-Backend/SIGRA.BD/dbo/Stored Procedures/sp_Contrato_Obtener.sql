CREATE PROCEDURE sp_Contrato_Obtener
    @IdContrato INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT c.IdContrato, cl.Empresa, c.Estado AS EstadoRegistrado, CASE
        WHEN c.Estado IN ('Activo', 'Renovado') AND c.FechaVencimiento < CAST(GETDATE() AS DATE) THEN 'Vencido'
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
           CAST(CASE WHEN EXISTS (SELECT 1 FROM ContratoDocumento d WHERE d.IdContrato = c.IdContrato) THEN 1 ELSE 0 END AS BIT) AS TieneDocumento, 0 AS CantidadEquipos, '' AS Series
    FROM Contrato c
        INNER JOIN Cliente cl ON cl.IdCliente = c.IdCliente
        LEFT JOIN Usuario v ON v.IdUsuario = c.IdVendedor
        LEFT JOIN PlantillaContrato p ON p.IdPlantilla = c.IdPlantilla
    WHERE c.IdContrato = @IdContrato;
END
