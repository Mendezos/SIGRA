CREATE PROCEDURE sp_Contrato_AgregarEquipo
    @IdContrato      INT,
    @IdEquipo        INT,
    @FechaAsignacion DATE,
    @IdUsuario       INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Etiqueta VARCHAR(20) = 'CT-' + RIGHT('0000' + CAST(@IdContrato AS VARCHAR(10)), 4);

    BEGIN TRANSACTION;

    UPDATE Equipo SET Estado = 'Alquilado' WHERE IdEquipo = @IdEquipo AND Estado = 'Disponible';
    IF @@ROWCOUNT = 0
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, 'El equipo seleccionado no se encuentra disponible en el inventario.', 1;
    END

    INSERT INTO ContratoEquipo (IdContrato, IdEquipo, FechaAsignacion) VALUES (@IdContrato, @IdEquipo, @FechaAsignacion);

    INSERT INTO MovimientoInventario (IdEquipo, IdUsuario, TipoMovimiento, EstadoAnterior, EstadoNuevo, Observacion)
    VALUES (@IdEquipo, @IdUsuario, N'Asignación a contrato', 'Disponible', 'Alquilado', N'Contrato ' + @Etiqueta);

    INSERT INTO BitacoraEquipo (IdEquipo, Descripcion)
    VALUES (@IdEquipo, N'Asignado al contrato ' + @Etiqueta + N'.');

    COMMIT TRANSACTION;
END
