-- Una edición no modifica la versión anterior: crea una versión nueva que usarán los contratos futuros.
CREATE PROCEDURE sp_PlantillaContrato_Editar
    @IdPlantilla            INT,
    @Clausulas              VARCHAR(MAX),
    @Responsabilidades      VARCHAR(MAX),
    @CondicionesCancelacion VARCHAR(MAX) = NULL,
    @Motivo                 VARCHAR(300),
    @IdUsuario              INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    DECLARE @Activa BIT, @Version INT;
    SELECT @Activa = Activa, @Version = VersionActual FROM PlantillaContrato WITH (UPDLOCK) WHERE IdPlantilla = @IdPlantilla;

    IF @Version IS NULL THROW 50001, 'La plantilla indicada no fue encontrada.', 1;
    IF @Activa = 0 THROW 50001, 'La plantilla está inactiva. Reactívela antes de editarla.', 1;

    SET @Version = @Version + 1;

    INSERT INTO PlantillaContratoVersion (IdPlantilla, Version, Clausulas, Responsabilidades, CondicionesCancelacion, Motivo, IdUsuario)
    VALUES (@IdPlantilla, @Version, @Clausulas, @Responsabilidades, @CondicionesCancelacion, @Motivo, @IdUsuario);

    UPDATE PlantillaContrato SET VersionActual = @Version WHERE IdPlantilla = @IdPlantilla;

    COMMIT TRANSACTION;

    SELECT @Version AS Version;
END
