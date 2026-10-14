CREATE PROCEDURE sp_Alerta_Atender
    @IdAlerta  INT,
    @Nota      VARCHAR(1000),
    @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE AlertaFrecuencia
    SET Atendida = 1, FechaAtencion = GETDATE(), NotaAtencion = @Nota, IdUsuarioAtencion = @IdUsuario
    WHERE IdAlerta = @IdAlerta AND Atendida = 0;

    IF @@ROWCOUNT = 0
        THROW 50001, N'La alerta ya fue marcada como atendida.', 1;
END
