CREATE PROCEDURE [dbo].[sp_Ticket_Bloquear]
AS
BEGIN
    SET NOCOUNT ON;
    IF @@TRANCOUNT=0 THROW 50001, 'La operación requiere una transacción.', 1;
    IF NOT EXISTS (SELECT 1 FROM Correlativo WITH (UPDLOCK,HOLDLOCK) WHERE Nombre='GTST')
        INSERT Correlativo (Nombre,Valor) SELECT 'GTST',COALESCE(MAX(NumeroBoleta),0) FROM TicketGestion;
    DECLARE @Ultimo BIGINT=(SELECT COALESCE(MAX(NumeroBoleta),0) FROM TicketGestion);
    -- El bloqueo se conserva hasta confirmar o revertir toda la operación.
    UPDATE Correlativo SET Valor=CASE WHEN Valor<@Ultimo THEN @Ultimo ELSE Valor END WHERE Nombre='GTST';
END;
