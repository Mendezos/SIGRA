
CREATE PROCEDURE sp_Rol_Editar
    @IdRol INT,
    @Nombre VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Rol
    SET Nombre = @Nombre
    WHERE IdRol = @IdRol;

    SELECT IdRol, Nombre, Activo
    FROM Rol
    WHERE IdRol = @IdRol;
END
