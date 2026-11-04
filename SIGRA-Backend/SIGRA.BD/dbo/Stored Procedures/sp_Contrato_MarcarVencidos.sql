CREATE PROCEDURE sp_Contrato_MarcarVencidos
AS
BEGIN
    SET NOCOUNT ON;

    -- Un contrato renovado por otro (Renovado con sucesor) conserva su estado: ya fue sustituido, no "vence".
    UPDATE c SET Estado = 'Vencido'
    FROM Contrato c
    WHERE c.Estado IN ('Activo', 'Renovado') AND c.FechaVencimiento < CAST(GETDATE() AS DATE)
      AND NOT (c.Estado = 'Renovado' AND EXISTS (SELECT 1 FROM Contrato s WHERE s.IdContratoOrigen = c.IdContrato));
    SELECT @@ROWCOUNT AS Actualizados;
END
