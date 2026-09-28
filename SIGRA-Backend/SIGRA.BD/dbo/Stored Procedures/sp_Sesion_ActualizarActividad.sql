CREATE PROCEDURE sp_Sesion_ActualizarActividad
    @TokenId VARCHAR(64)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE SesionUsuario SET UltimaActividad = GETUTCDATE() WHERE TokenId = @TokenId AND Activa = 1;
END
