CREATE PROCEDURE sp_TokenRecuperacion_ObtenerValido
    @Token VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT IdToken, IdUsuario, Token, Expira, Usado
    FROM TokenRecuperacion
    WHERE Token = @Token AND Usado = 0 AND Expira > GETUTCDATE();
END
