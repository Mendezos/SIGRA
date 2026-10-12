CREATE PROCEDURE sp_Contrato_MarcarVencidos
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Contrato SET Estado = 'Vencido'
    WHERE Estado IN ('Activo', 'Renovado') AND FechaVencimiento < CAST(GETDATE() AS DATE);

    SELECT @@ROWCOUNT AS Actualizados;
END
