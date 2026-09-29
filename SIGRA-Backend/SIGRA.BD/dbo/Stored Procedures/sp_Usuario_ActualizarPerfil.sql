
CREATE PROCEDURE sp_Usuario_ActualizarPerfil
    @IdUsuario INT,
    @Nombre VARCHAR(150),
    @Telefono VARCHAR(20) = NULL,
    @Foto VARCHAR(300) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Usuario
    SET Nombre = @Nombre,
        Telefono = @Telefono,
        Foto = @Foto
    WHERE IdUsuario = @IdUsuario;
END
