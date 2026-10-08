CREATE PROCEDURE sp_Categoria_Listar
AS
BEGIN
    SET NOCOUNT ON;

    SELECT c.IdCategoria, c.Nombre, c.ManejaCantidad, ISNULL(s.CantidadMinima, 0) AS CantidadMinima
    FROM CategoriaEquipo c
    LEFT JOIN StockMinimoCategoria s ON s.IdCategoria = c.IdCategoria
    ORDER BY c.Nombre;
END
