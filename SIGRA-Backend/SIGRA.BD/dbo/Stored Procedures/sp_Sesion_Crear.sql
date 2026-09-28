CREATE PROCEDURE sp_Sesion_Crear
    @IdUsuario INT,
    @TokenId VARCHAR(64),
    @FechaExpiracion DATETIME
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO SesionUsuario (IdUsuario, TokenId, FechaExpiracion, UltimaActividad, Activa)
    VALUES (@IdUsuario, @TokenId, @FechaExpiracion, GETUTCDATE(), 1);
END
