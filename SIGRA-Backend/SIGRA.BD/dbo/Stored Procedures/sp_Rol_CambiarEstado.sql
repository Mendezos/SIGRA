
CREATE PROCEDURE sp_Rol_CambiarEstado
    @IdRol INT,
    @Activo BIT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Rol
    SET Activo = @Activo
    WHERE IdRol = @IdRol;

    SELECT IdRol, Nombre, Activo
    FROM Rol
    WHERE IdRol = @IdRol;
END
