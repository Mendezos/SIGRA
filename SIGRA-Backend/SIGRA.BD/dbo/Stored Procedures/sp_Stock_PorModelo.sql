CREATE PROCEDURE sp_Stock_PorModelo
    @IdCategoria INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT m.IdModelo, c.Nombre AS Categoria, m.Marca, m.Modelo,
           ISNULL(SUM(e.Cantidad), 0) AS Total,
           ISNULL(SUM(CASE WHEN e.Estado = 'Disponible' THEN e.Cantidad END), 0) AS Disponibles,
           ISNULL(SUM(CASE WHEN e.Estado = 'Alquilado' THEN e.Cantidad END), 0) AS EnUso,
           ISNULL(SUM(CASE WHEN e.Estado IN ('En mantenimiento', 'En reparación', 'En garantía') THEN e.Cantidad END), 0) AS EnTaller,
           ISNULL(SUM(CASE WHEN e.Estado = 'Dado de baja' THEN e.Cantidad END), 0) AS DadosDeBaja
    FROM ModeloEquipo m
    INNER JOIN CategoriaEquipo c ON c.IdCategoria = m.IdCategoria
    LEFT JOIN Equipo e ON e.IdModelo = m.IdModelo
    WHERE @IdCategoria IS NULL OR m.IdCategoria = @IdCategoria
    GROUP BY m.IdModelo, c.Nombre, m.Marca, m.Modelo
    ORDER BY c.Nombre, m.Marca, m.Modelo;
END
