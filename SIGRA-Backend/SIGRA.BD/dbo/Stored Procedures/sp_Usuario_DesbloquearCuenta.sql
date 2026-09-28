
CREATE PROCEDURE sp_Usuario_DesbloquearCuenta
    @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Usuario
    SET IntentosFallidos = 0,
        BloqueadoHasta = NULL,
        FechaBloqueo = NULL
    WHERE IdUsuario = @IdUsuario;
END