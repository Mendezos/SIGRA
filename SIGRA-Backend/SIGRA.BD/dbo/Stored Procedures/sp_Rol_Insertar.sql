
CREATE PROCEDURE sp_Rol_Insertar
    @Nombre VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Rol (Nombre, Activo)
    VALUES (@Nombre, 1);

    SELECT IdRol, Nombre, Activo
    FROM Rol
    WHERE IdRol = SCOPE_IDENTITY();
END
