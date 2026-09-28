
CREATE PROCEDURE sp_TokenRecuperacion_Crear
    @IdUsuario INT,
    @Token VARCHAR(255),
    @Expira DATETIME
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO TokenRecuperacion (IdUsuario, Token, Expira, Usado)
    VALUES (@IdUsuario, @Token, @Expira, 0);
END