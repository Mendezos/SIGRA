CREATE PROCEDURE sp_Contrato_AlertasPendientes
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);

    SELECT c.IdContrato, cl.Empresa, cl.Contacto, cl.Correo AS CorreoCliente, c.FechaInicio, c.FechaVencimiento, t.Tipo
    FROM Contrato c
    INNER JOIN Cliente cl ON cl.IdCliente = c.IdCliente
    CROSS APPLY (
        SELECT '30 dias' AS Tipo WHERE c.FechaVencimiento >= @Hoy AND c.FechaVencimiento <= DATEADD(DAY, 30, @Hoy)
        UNION ALL
        SELECT '90 dias' WHERE c.FechaVencimiento > DATEADD(DAY, 30, @Hoy) AND c.FechaVencimiento <= DATEADD(DAY, 90, @Hoy)
        UNION ALL
        SELECT '3 anios' WHERE DATEADD(YEAR, 3, c.FechaInicio) <= @Hoy
    ) t
    WHERE c.Estado IN ('Activo', 'Renovado')
      AND NOT EXISTS (SELECT 1 FROM AlertaContrato a WHERE a.IdContrato = c.IdContrato AND a.Tipo = t.Tipo);
END
