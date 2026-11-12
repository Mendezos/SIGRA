CREATE PROCEDURE sp_ContratoAccesorio_Guardar
    @IdContrato INT,
    @ItemsJson  NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    EXEC sp_ContratoAccesorio_Aplicar @IdContrato = @IdContrato, @ItemsJson = @ItemsJson;

    COMMIT TRANSACTION;
END
