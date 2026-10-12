
CREATE PROCEDURE sp_Rol_Listar
AS
BEGIN
    SET NOCOUNT ON;

    SELECT IdRol, Nombre, Descripcion, Activo
    FROM Rol
    ORDER BY Nombre;
END
