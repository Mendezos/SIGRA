CREATE PROCEDURE sp_StockMinimo_Guardar
    @IdCategoria    INT,
    @CantidadMinima INT
AS
BEGIN
    SET NOCOUNT ON;

    MERGE StockMinimoCategoria AS destino
    USING (SELECT @IdCategoria AS IdCategoria) AS origen
        ON destino.IdCategoria = origen.IdCategoria
    WHEN MATCHED THEN UPDATE SET CantidadMinima = @CantidadMinima
    WHEN NOT MATCHED THEN INSERT (IdCategoria, CantidadMinima) VALUES (@IdCategoria, @CantidadMinima);
END
