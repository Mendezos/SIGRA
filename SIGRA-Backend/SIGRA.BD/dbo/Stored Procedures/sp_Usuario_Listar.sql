CREATE PROCEDURE sp_Usuario_Listar
AS
BEGIN
    SET NOCOUNT ON;
    SELECT u.IdUsuario, u.IdRol, r.Nombre AS NombreRol, u.IdCliente, u.Nombre, u.Correo, u.Telefono,
           u.PasswordHash, u.Foto, u.Activo, u.IntentosFallidos, u.BloqueadoHasta, u.FechaBloqueo
    FROM Usuario u
    INNER JOIN Rol r ON r.IdRol = u.IdRol
    ORDER BY u.Nombre ASC;
END
