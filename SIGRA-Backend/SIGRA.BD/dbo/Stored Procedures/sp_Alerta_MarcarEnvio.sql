CREATE PROCEDURE sp_Alerta_MarcarEnvio
    @IdAlerta INT,
    @Enviado  BIT,
    @Error    VARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE AlertaFrecuencia
    SET CorreoEnviado = @Enviado,
        FechaEnvio = CASE WHEN @Enviado = 1 THEN GETDATE() ELSE FechaEnvio END,
        IntentosEnvio = IntentosEnvio + 1,
        ErrorEnvio = CASE WHEN @Enviado = 1 THEN NULL ELSE LEFT(@Error, 500) END
    WHERE IdAlerta = @IdAlerta;
END
