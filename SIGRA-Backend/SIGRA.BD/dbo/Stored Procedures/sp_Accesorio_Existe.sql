CREATE PROCEDURE sp_Accesorio_Existe
    @IdModelo  INT,
    @Nombre    VARCHAR(100),
    @IdExcluir INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM AccesorioModelo
        WHERE IdModelo = @IdModelo AND Nombre = @Nombre AND (@IdExcluir IS NULL OR IdAccesorioModelo <> @IdExcluir)
    ) THEN 1 ELSE 0 END;
END
