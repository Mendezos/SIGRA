
CREATE PROCEDURE sp_PoliticaSeguridad_CrearVersion
    @MinutosInactividad INT,
    @MaxIntentosFallidos INT,
    @LongitudMinimaPassword INT,
    @MinutosBloqueo INT,
    @VigenciaEnlaceMinutos INT,
    @IdUsuarioCreador INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    UPDATE PoliticaSeguridad SET Activa = 0 WHERE Activa = 1;

    INSERT INTO PoliticaSeguridad
        (MinutosInactividad, MaxIntentosFallidos, LongitudMinimaPassword, MinutosBloqueo, VigenciaEnlaceMinutos, IdUsuarioCreador, Activa)
    VALUES
        (@MinutosInactividad, @MaxIntentosFallidos, @LongitudMinimaPassword, @MinutosBloqueo, @VigenciaEnlaceMinutos, @IdUsuarioCreador, 1);

    COMMIT TRANSACTION;

    SELECT TOP 1 IdPolitica, MinutosInactividad, MaxIntentosFallidos, LongitudMinimaPassword,
                  MinutosBloqueo, VigenciaEnlaceMinutos, IdUsuarioCreador, FechaCreacion, Activa
    FROM PoliticaSeguridad
    WHERE Activa = 1;
END