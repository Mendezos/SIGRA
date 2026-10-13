CREATE PROCEDURE sp_Ticket_Cerrar
    @IdTicket         INT,
    @IdUsuario        INT,             -- técnico que completa el formulario de cierre
    @Hallazgos        VARCHAR(MAX) = NULL,
    @TrabajoRealizado VARCHAR(MAX) = NULL,
    @Resolucion       VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Estado VARCHAR(30) = (SELECT Estado FROM Ticket WHERE IdTicket = @IdTicket);
    IF @Estado IS NULL
        THROW 50001, 'El ticket indicado no existe.', 1;
    IF @Estado = 'Cerrada'
        THROW 50001, 'El ticket ya se encuentra cerrado.', 1;

    BEGIN TRANSACTION;

    INSERT INTO Reparacion (IdTicket, TecnicoResponsable, Hallazgos, TrabajoRealizado, Resolucion)
    VALUES (@IdTicket, @IdUsuario, @Hallazgos, @TrabajoRealizado, @Resolucion);

    UPDATE TicketEstadoHistorial SET FechaFin = GETDATE() WHERE IdTicket = @IdTicket AND FechaFin IS NULL;
    INSERT INTO TicketEstadoHistorial (IdTicket, IdUsuario, Estado) VALUES (@IdTicket, @IdUsuario, 'Cerrada');

    -- Al cerrarse, el trigger trg_Ticket_BitacoraRepetidora agrega el detalle a la bitácora de cada repetidora del ticket.
    UPDATE Ticket SET Estado = 'Cerrada' WHERE IdTicket = @IdTicket;

    COMMIT TRANSACTION;
END
