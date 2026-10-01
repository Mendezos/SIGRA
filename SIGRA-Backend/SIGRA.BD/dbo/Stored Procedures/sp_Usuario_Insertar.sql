CREATE PROCEDURE sp_Usuario_Insertar
    @IdRol INT,
    @Nombre VARCHAR(150),
    @Correo VARCHAR(150),
    @Telefono VARCHAR(20) = NULL,
    @PasswordHash VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Usuario (IdRol, Nombre, Correo, Telefono, PasswordHash, Activo, IntentosFallidos)
    VALUES (@IdRol, @Nombre, @Correo, @Telefono, @PasswordHash, 1, 0);

    SELECT u.IdUsuario, u.IdRol, r.Nombre AS NombreRol, u.IdCliente, u.Nombre, u.Correo, u.Telefono,
           u.PasswordHash, u.Foto, u.Activo, u.IntentosFallidos, u.BloqueadoHasta, u.FechaBloqueo
    FROM Usuario u
    INNER JOIN Rol r ON r.IdRol = u.IdRol
    WHERE u.IdUsuario = SCOPE_IDENTITY();
END
