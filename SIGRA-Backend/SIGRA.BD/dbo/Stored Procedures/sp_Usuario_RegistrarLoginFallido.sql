CREATE PROCEDURE sp_Usuario_RegistrarLoginFallido
    @IdUsuario INT,
    @MaxIntentosFallidos INT,
    @DuracionBloqueoMinutos INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Usuario
    SET IntentosFallidos = IntentosFallidos + 1
    WHERE IdUsuario = @IdUsuario;

    DECLARE @IntentosActuales INT;
    DECLARE @CuentaBloqueada BIT = 0;
    DECLARE @BloqueadoHasta DATETIME;

    SELECT @IntentosActuales = IntentosFallidos, @BloqueadoHasta = BloqueadoHasta
    FROM Usuario WHERE IdUsuario = @IdUsuario;

    IF @IntentosActuales >= @MaxIntentosFallidos
    BEGIN
        SET @BloqueadoHasta = DATEADD(MINUTE, @DuracionBloqueoMinutos, GETUTCDATE());

        UPDATE Usuario
        SET BloqueadoHasta = @BloqueadoHasta,
            FechaBloqueo    = GETUTCDATE()
        WHERE IdUsuario = @IdUsuario;

        SET @CuentaBloqueada = 1;
    END

    SELECT @IntentosActuales AS IntentosFallidos, @CuentaBloqueada AS CuentaBloqueada, @BloqueadoHasta AS BloqueadoHasta;
END
