CREATE PROCEDURE sp_Repuesto_Existe
    @IdModelo  INT,
    @Nombre    VARCHAR(100),
    @IdExcluir INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM Repuesto
        WHERE IdModelo = @IdModelo AND Nombre = @Nombre AND (@IdExcluir IS NULL OR IdRepuesto <> @IdExcluir)
    ) THEN 1 ELSE 0 END;
END
