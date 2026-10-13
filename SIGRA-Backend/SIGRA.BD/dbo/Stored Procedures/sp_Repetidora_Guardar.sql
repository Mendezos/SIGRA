CREATE PROCEDURE sp_Repetidora_Guardar
    @IdEquipo             INT,
    @Frecuencia           VARCHAR(30),
    @FrecuenciaRecepcion  VARCHAR(30),
    @Potencia             VARCHAR(30),
    @Accesorios           VARCHAR(500) = NULL,
    @DireccionInstalacion VARCHAR(200),
    @CoordenadasGPS       VARCHAR(50) = NULL,
    @Clasificacion        VARCHAR(30),   -- 'Alquilada por Radifax' (facturable) o 'Propia del cliente' (sin cobro)
    @IdUsuario            INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Existia BIT = CASE WHEN EXISTS (SELECT 1 FROM RepetidoraDetalle WHERE IdEquipo = @IdEquipo) THEN 1 ELSE 0 END;

    BEGIN TRANSACTION;

    IF @Existia = 1
        UPDATE RepetidoraDetalle
        SET Frecuencia = @Frecuencia, FrecuenciaRecepcion = @FrecuenciaRecepcion, Potencia = @Potencia,
            Accesorios = @Accesorios, DireccionInstalacion = @DireccionInstalacion, CoordenadasGPS = @CoordenadasGPS,
            Clasificacion = @Clasificacion, IdUsuarioRegistro = @IdUsuario
        WHERE IdEquipo = @IdEquipo;
    ELSE
        INSERT INTO RepetidoraDetalle (IdEquipo, Frecuencia, FrecuenciaRecepcion, Potencia, Accesorios, DireccionInstalacion, CoordenadasGPS, Clasificacion, IdUsuarioRegistro)
        VALUES (@IdEquipo, @Frecuencia, @FrecuenciaRecepcion, @Potencia, @Accesorios, @DireccionInstalacion, @CoordenadasGPS, @Clasificacion, @IdUsuario);

    INSERT INTO BitacoraEquipo (IdEquipo, Descripcion)
    VALUES (@IdEquipo, CASE WHEN @Existia = 1 THEN N'Ficha técnica de la repetidora actualizada.' ELSE N'Ficha técnica de la repetidora registrada.' END
                       + N' Instalación: ' + @DireccionInstalacion + N'. Clasificación: ' + @Clasificacion + N' ('
                       + CASE WHEN @Clasificacion = 'Alquilada por Radifax'
                              THEN N'facturable en los reportes de alquiler'
                              ELSE N'sin cobro; seguimiento solo por bitácora de garantía y control administrativo' END
                       + N').');

    COMMIT TRANSACTION;
END
