
CREATE PROCEDURE sp_RolPermiso_Definir
    @IdRol INT,
    @IdModulo INT,
    @Lectura BIT,
    @Escritura BIT,
    @Edicion BIT,
    @Eliminacion BIT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    DECLARE @IdPermiso INT = (SELECT IdPermiso FROM Permiso WHERE IdModulo = @IdModulo);

    IF @IdPermiso IS NULL
    BEGIN
        INSERT INTO Permiso (IdModulo) VALUES (@IdModulo);
        SET @IdPermiso = SCOPE_IDENTITY();
    END

    IF EXISTS (SELECT 1 FROM RolPermiso WHERE IdRol = @IdRol AND IdPermiso = @IdPermiso)
    BEGIN
        UPDATE RolPermiso
        SET Lectura = @Lectura, Escritura = @Escritura, Edicion = @Edicion, Eliminacion = @Eliminacion
        WHERE IdRol = @IdRol AND IdPermiso = @IdPermiso;
    END
    ELSE
    BEGIN
        INSERT INTO RolPermiso (IdRol, IdPermiso, Lectura, Escritura, Edicion, Eliminacion)
        VALUES (@IdRol, @IdPermiso, @Lectura, @Escritura, @Edicion, @Eliminacion);
    END

    COMMIT TRANSACTION;
END
