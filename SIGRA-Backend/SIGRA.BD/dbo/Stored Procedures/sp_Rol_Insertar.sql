
CREATE PROCEDURE sp_Rol_Insertar
    @Nombre VARCHAR(100),
    @Descripcion VARCHAR(250) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Rol (Nombre, Descripcion, Activo)
    VALUES (@Nombre, @Descripcion, 1);

    SELECT IdRol, Nombre, Descripcion, Activo
    FROM Rol
    WHERE IdRol = SCOPE_IDENTITY();
END
