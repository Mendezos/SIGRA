CREATE PROCEDURE sp_Sesion_Cerrar
    @TokenId VARCHAR(64)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE SesionUsuario SET Activa = 0, FechaCierre = GETUTCDATE() WHERE TokenId = @TokenId AND Activa = 1;
END
