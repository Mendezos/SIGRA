CREATE PROCEDURE sp_ContratoAccesorio_Guardar
    @IdContrato INT,
    @ItemsJson  NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    DELETE FROM ContratoAccesorio WHERE IdContrato = @IdContrato;

    INSERT INTO ContratoAccesorio (IdContrato, IdAccesorioModelo, Cantidad)
    SELECT @IdContrato, j.IdAccesorioModelo, j.Cantidad
    FROM OPENJSON(ISNULL(@ItemsJson, '[]'))
         WITH (IdAccesorioModelo INT '$.idAccesorioModelo', Cantidad INT '$.cantidad') j;

    COMMIT TRANSACTION;
END
