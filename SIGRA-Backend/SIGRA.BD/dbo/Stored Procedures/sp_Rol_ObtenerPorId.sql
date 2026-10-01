
CREATE PROCEDURE sp_Rol_ObtenerPorId
    @IdRol INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT IdRol, Nombre, Descripcion, Activo
    FROM Rol
    WHERE IdRol = @IdRol;
END
