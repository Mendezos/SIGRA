CREATE PROCEDURE [dbo].[sp_Usuario_RegistrarLoginExitoso]
    @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Usuario
    SET IntentosFallidos = 0,
        BloqueadoHasta = NULL,
        FechaBloqueo = NULL,
        UltimoAcceso = SYSUTCDATETIME()
    WHERE IdUsuario = @IdUsuario;
END;