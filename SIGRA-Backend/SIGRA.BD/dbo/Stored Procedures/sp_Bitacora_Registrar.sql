CREATE PROCEDURE sp_Bitacora_Registrar
    @IdEquipo    INT,
    @IdTicket    INT = NULL,
    @Descripcion VARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    IF @IdTicket IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Ticket WHERE IdTicket = @IdTicket)
        THROW 50001, 'La boleta indicada no existe.', 1;

    INSERT INTO BitacoraEquipo (IdEquipo, IdTicket, Descripcion) VALUES (@IdEquipo, @IdTicket, @Descripcion);
END
