CREATE PROCEDURE sp_Accesorio_Listar
AS
BEGIN
    SET NOCOUNT ON;

    SELECT a.IdAccesorioModelo AS Id, a.IdModelo, m.Marca + ' ' + m.Modelo AS Modelo, c.Nombre AS Categoria, a.Nombre, a.Cantidad
    FROM AccesorioModelo a
    INNER JOIN ModeloEquipo m ON m.IdModelo = a.IdModelo
    INNER JOIN CategoriaEquipo c ON c.IdCategoria = m.IdCategoria
    ORDER BY m.Marca, m.Modelo, a.Nombre;
END
