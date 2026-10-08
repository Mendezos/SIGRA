CREATE PROCEDURE sp_Equipo_CambiarEstado
    @IdEquipo       INT,
    @EstadoNuevo    VARCHAR(30),
    @IdUsuario      INT,
    @TipoMovimiento VARCHAR(50),
    @Observacion    VARCHAR(MAX) = NULL,
    @MotivoBaja     VARCHAR(300) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @EstadoAnterior VARCHAR(30);

    BEGIN TRANSACTION;

    SELECT @EstadoAnterior = Estado FROM Equipo WHERE IdEquipo = @IdEquipo;

    UPDATE Equipo
    SET Estado = @EstadoNuevo,
        FechaBaja = CASE WHEN @EstadoNuevo = 'Dado de baja' THEN CAST(GETDATE() AS DATE) ELSE NULL END,
        MotivoBaja = CASE WHEN @EstadoNuevo = 'Dado de baja' THEN @MotivoBaja ELSE NULL END
    WHERE IdEquipo = @IdEquipo;

    INSERT INTO MovimientoInventario (IdEquipo, IdUsuario, TipoMovimiento, EstadoAnterior, EstadoNuevo, Observacion)
    VALUES (@IdEquipo, @IdUsuario, @TipoMovimiento, @EstadoAnterior, @EstadoNuevo, @Observacion);

    COMMIT TRANSACTION;
END
