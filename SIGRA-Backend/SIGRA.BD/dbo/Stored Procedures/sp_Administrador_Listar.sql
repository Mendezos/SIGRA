CREATE PROCEDURE sp_Administrador_Listar
AS
BEGIN
    SET NOCOUNT ON;

    SELECT u.IdUsuario, u.Nombre, u.Correo
    FROM Usuario u
    INNER JOIN Rol r ON r.IdRol = u.IdRol
    WHERE r.Nombre = 'Administrador del sistema' AND u.Activo = 1;
END
