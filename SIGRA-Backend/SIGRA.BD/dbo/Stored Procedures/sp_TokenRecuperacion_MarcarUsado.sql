
CREATE PROCEDURE sp_TokenRecuperacion_MarcarUsado
    @IdToken INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE TokenRecuperacion SET Usado = 1 WHERE IdToken = @IdToken;
END