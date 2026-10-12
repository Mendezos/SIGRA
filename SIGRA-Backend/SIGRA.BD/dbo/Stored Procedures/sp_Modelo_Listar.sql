CREATE PROCEDURE sp_Modelo_Listar
    @IdCategoria INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT m.IdModelo, m.IdCategoria, c.Nombre AS Categoria, m.Marca, m.Modelo, m.DescripcionTecnica
    FROM ModeloEquipo m
    INNER JOIN CategoriaEquipo c ON c.IdCategoria = m.IdCategoria
    WHERE @IdCategoria IS NULL OR m.IdCategoria = @IdCategoria
    ORDER BY c.Nombre, m.Marca, m.Modelo;
END
