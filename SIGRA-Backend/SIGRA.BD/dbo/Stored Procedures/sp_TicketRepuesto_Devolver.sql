-- Deshace el uso de un repuesto (por ejemplo, si el técnico se equivocó): regresa las existencias a bodega.
CREATE PROCEDURE sp_TicketRepuesto_Devolver
    @IdTicket          INT,
    @IdTicketRepuesto  INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    DECLARE @IdRepuesto INT, @Cantidad INT;
    SELECT @IdRepuesto = IdRepuesto, @Cantidad = Cantidad
    FROM TicketRepuesto WITH (UPDLOCK)
    WHERE IdTicketRepuesto = @IdTicketRepuesto AND IdTicket = @IdTicket;

    IF @IdRepuesto IS NULL THROW 50001, 'El repuesto indicado no está registrado en esta boleta.', 1;

    UPDATE Repuesto SET Cantidad = Cantidad + @Cantidad WHERE IdRepuesto = @IdRepuesto;
    DELETE FROM TicketRepuesto WHERE IdTicketRepuesto = @IdTicketRepuesto;

    COMMIT TRANSACTION;

    SELECT 1;
END
