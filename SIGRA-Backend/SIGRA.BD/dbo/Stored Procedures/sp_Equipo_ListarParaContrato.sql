CREATE PROCEDURE sp_Equipo_ListarParaContrato
AS
BEGIN
    SET NOCOUNT ON;

    SELECT e.IdEquipo, e.NumeroSerie, m.Marca, m.Modelo, c.Nombre AS Categoria, e.Ubicacion
    FROM Equipo e
    INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    INNER JOIN CategoriaEquipo c ON c.IdCategoria = m.IdCategoria
    WHERE e.Estado = 'Disponible' AND c.ManejaCantidad = 0
    ORDER BY c.Nombre, m.Marca, m.Modelo, e.NumeroSerie;
END
