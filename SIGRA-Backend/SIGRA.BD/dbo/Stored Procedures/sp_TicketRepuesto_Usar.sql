-- Registra un repuesto usado en la reparación y lo descuenta de bodega en la misma transacción.
CREATE PROCEDURE sp_TicketRepuesto_Usar
    @IdTicket   INT,
    @IdRepuesto INT,
    @Cantidad   INT,
    @IdUsuario  INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Cantidad IS NULL OR @Cantidad < 1 THROW 50001, 'La cantidad de repuestos debe ser mayor que cero.', 1;

    BEGIN TRANSACTION;

    DECLARE @Disponible INT, @Nombre NVARCHAR(250);
    SELECT @Disponible = r.Cantidad, @Nombre = r.Nombre + N' de ' + m.Marca + N' ' + m.Modelo
    FROM Repuesto r WITH (UPDLOCK, HOLDLOCK)
    INNER JOIN ModeloEquipo m ON m.IdModelo = r.IdModelo
    WHERE r.IdRepuesto = @IdRepuesto;

    IF @Nombre IS NULL THROW 50001, 'El repuesto seleccionado no existe.', 1;

    IF @Disponible < @Cantidad
    BEGIN
        DECLARE @Mensaje NVARCHAR(400) = N'No hay suficientes existencias de ' + @Nombre + N' (en bodega: '
            + CAST(@Disponible AS NVARCHAR(10)) + N', se necesitan ' + CAST(@Cantidad AS NVARCHAR(10)) + N').';
        THROW 50001, @Mensaje, 1;
    END

    UPDATE Repuesto SET Cantidad = Cantidad - @Cantidad WHERE IdRepuesto = @IdRepuesto;

    INSERT INTO TicketRepuesto (IdTicket, IdRepuesto, Cantidad, IdUsuario)
    VALUES (@IdTicket, @IdRepuesto, @Cantidad, @IdUsuario);

    COMMIT TRANSACTION;

    SELECT 1;
END
