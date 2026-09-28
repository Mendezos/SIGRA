CREATE PROCEDURE sp_Sesion_CerrarTodasDelUsuario
    @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE SesionUsuario SET Activa = 0, FechaCierre = GETUTCDATE() WHERE IdUsuario = @IdUsuario AND Activa = 1;
END
