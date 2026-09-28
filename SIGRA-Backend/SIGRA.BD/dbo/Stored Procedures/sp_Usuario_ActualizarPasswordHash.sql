
CREATE PROCEDURE sp_Usuario_ActualizarPasswordHash
    @IdUsuario INT,
    @PasswordHash VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Usuario SET PasswordHash = @PasswordHash WHERE IdUsuario = @IdUsuario;
END