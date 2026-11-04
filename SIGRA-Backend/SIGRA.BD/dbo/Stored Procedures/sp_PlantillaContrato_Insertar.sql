CREATE PROCEDURE sp_PlantillaContrato_Insertar
    @Nombre                 VARCHAR(120),
    @IdCategoria            INT = NULL,
    @Clausulas              VARCHAR(MAX),
    @Responsabilidades      VARCHAR(MAX),
    @CondicionesCancelacion VARCHAR(MAX) = NULL,
    @Activa                 BIT = 1,
    @IdUsuario              INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @IdCategoria IS NOT NULL AND NOT EXISTS (SELECT 1 FROM CategoriaEquipo WHERE IdCategoria = @IdCategoria)
        THROW 50001, 'El tipo de equipo indicado no existe.', 1;

    IF @Activa = 1 AND EXISTS (SELECT 1 FROM PlantillaContrato WHERE Nombre = @Nombre AND Activa = 1)
        THROW 50001, 'Ya existe una plantilla activa con ese nombre. Use otro nombre.', 1;

    BEGIN TRANSACTION;

    INSERT INTO PlantillaContrato (Nombre, IdCategoria, Activa, VersionActual, IdUsuario)
    VALUES (@Nombre, @IdCategoria, @Activa, 1, @IdUsuario);
    DECLARE @IdPlantilla INT = SCOPE_IDENTITY();

    INSERT INTO PlantillaContratoVersion (IdPlantilla, Version, Clausulas, Responsabilidades, CondicionesCancelacion, Motivo, IdUsuario)
    VALUES (@IdPlantilla, 1, @Clausulas, @Responsabilidades, @CondicionesCancelacion, N'Versión inicial', @IdUsuario);

    COMMIT TRANSACTION;

    SELECT @IdPlantilla AS IdPlantilla;
END
