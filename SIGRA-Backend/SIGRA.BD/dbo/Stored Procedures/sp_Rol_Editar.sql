
CREATE PROCEDURE sp_Rol_Editar
    @IdRol INT,
    @Nombre VARCHAR(100),
    @Descripcion VARCHAR(250) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Rol
    SET Nombre = @Nombre,
        Descripcion = @Descripcion
    WHERE IdRol = @IdRol;

    SELECT IdRol, Nombre, Descripcion, Activo
    FROM Rol
    WHERE IdRol = @IdRol;
END
