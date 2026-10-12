CREATE PROCEDURE sp_Vendedor_Listar
AS
BEGIN
    SET NOCOUNT ON;

    SELECT u.IdUsuario, u.Nombre
    FROM Usuario u
    INNER JOIN Rol r ON r.IdRol = u.IdRol
    WHERE r.Nombre = 'Vendedor / Ejecutivo de cuenta' AND u.Activo = 1
    ORDER BY u.Nombre;
END
