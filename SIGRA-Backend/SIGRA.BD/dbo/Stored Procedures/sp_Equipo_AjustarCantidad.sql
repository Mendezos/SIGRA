CREATE PROCEDURE sp_Equipo_AjustarCantidad
    @IdEquipo       INT,
    @Delta          INT,
    @IdUsuario      INT,
    @TipoMovimiento VARCHAR(50),
    @Observacion    VARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Estado VARCHAR(30);

    BEGIN TRANSACTION;

    UPDATE Equipo SET Cantidad = Cantidad + @Delta WHERE IdEquipo = @IdEquipo;
    SELECT @Estado = Estado FROM Equipo WHERE IdEquipo = @IdEquipo;

    INSERT INTO MovimientoInventario (IdEquipo, IdUsuario, TipoMovimiento, EstadoAnterior, EstadoNuevo, Observacion, Cantidad)
    VALUES (@IdEquipo, @IdUsuario, @TipoMovimiento, @Estado, @Estado, @Observacion, ABS(@Delta));

    COMMIT TRANSACTION;
END
