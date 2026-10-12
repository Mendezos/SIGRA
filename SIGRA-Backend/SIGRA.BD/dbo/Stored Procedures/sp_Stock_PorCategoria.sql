CREATE PROCEDURE sp_Stock_PorCategoria
AS
BEGIN
    SET NOCOUNT ON;

    SELECT c.IdCategoria, c.Nombre AS Categoria,
           ISNULL(SUM(e.Cantidad), 0) AS Total,
           ISNULL(SUM(CASE WHEN e.Estado = 'Disponible' THEN e.Cantidad END), 0) AS Disponibles,
           ISNULL(SUM(CASE WHEN e.Estado = 'Alquilado' THEN e.Cantidad END), 0) AS EnUso,
           ISNULL(SUM(CASE WHEN e.Estado IN ('En mantenimiento', 'En reparación', 'En garantía') THEN e.Cantidad END), 0) AS EnTaller,
           ISNULL(SUM(CASE WHEN e.Estado = 'Dado de baja' THEN e.Cantidad END), 0) AS DadosDeBaja,
           ISNULL(MAX(s.CantidadMinima), 0) AS CantidadMinima
    FROM CategoriaEquipo c
    LEFT JOIN ModeloEquipo m ON m.IdCategoria = c.IdCategoria
    LEFT JOIN Equipo e ON e.IdModelo = m.IdModelo
    LEFT JOIN StockMinimoCategoria s ON s.IdCategoria = c.IdCategoria
    GROUP BY c.IdCategoria, c.Nombre
    ORDER BY c.Nombre;
END
