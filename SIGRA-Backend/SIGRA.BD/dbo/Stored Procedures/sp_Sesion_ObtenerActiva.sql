CREATE PROCEDURE sp_Sesion_ObtenerActiva
    @TokenId VARCHAR(64)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT IdSesion, IdUsuario, TokenId, FechaInicio, FechaExpiracion, UltimaActividad, FechaCierre, Activa
    FROM SesionUsuario
    WHERE TokenId = @TokenId AND Activa = 1 AND FechaExpiracion > GETUTCDATE();
END
