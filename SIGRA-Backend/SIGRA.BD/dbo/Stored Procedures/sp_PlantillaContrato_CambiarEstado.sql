-- Devuelve Cambio = 0 si la plantilla ya tenía el estado pedido (no se duplica el cambio).
CREATE PROCEDURE sp_PlantillaContrato_CambiarEstado
    @IdPlantilla INT,
    @Activa      BIT,
    @Motivo      VARCHAR(300) = NULL,
    @IdUsuario   INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    DECLARE @Actual BIT, @Nombre VARCHAR(120);
    SELECT @Actual = Activa, @Nombre = Nombre FROM PlantillaContrato WITH (UPDLOCK) WHERE IdPlantilla = @IdPlantilla;

    IF @Nombre IS NULL THROW 50001, 'La plantilla indicada no fue encontrada.', 1;

    IF @Actual = @Activa
    BEGIN
        COMMIT TRANSACTION;
        SELECT CAST(0 AS BIT) AS Cambio;
        RETURN;
    END

    IF @Activa = 1 AND EXISTS (SELECT 1 FROM PlantillaContrato WHERE Nombre = @Nombre AND Activa = 1 AND IdPlantilla <> @IdPlantilla)
        THROW 50001, 'No se puede reactivar: ya hay otra plantilla activa con ese nombre.', 1;

    UPDATE PlantillaContrato SET Activa = @Activa WHERE IdPlantilla = @IdPlantilla;

    INSERT INTO PlantillaContratoEstado (IdPlantilla, Activa, Motivo, IdUsuario)
    VALUES (@IdPlantilla, @Activa, @Motivo, @IdUsuario);

    COMMIT TRANSACTION;

    SELECT CAST(1 AS BIT) AS Cambio;
END
