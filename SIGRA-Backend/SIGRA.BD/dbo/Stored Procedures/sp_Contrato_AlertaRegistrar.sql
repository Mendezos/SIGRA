CREATE PROCEDURE sp_Contrato_AlertaRegistrar
    @IdContrato INT,
    @Tipo       VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM AlertaContrato WHERE IdContrato = @IdContrato AND Tipo = @Tipo)
        INSERT INTO AlertaContrato (IdContrato, Tipo) VALUES (@IdContrato, @Tipo);
END
