CREATE PROCEDURE sp_Repuesto_Listar
AS
BEGIN
    SET NOCOUNT ON;

    SELECT a.IdRepuesto AS Id, a.IdModelo, m.Marca + ' ' + m.Modelo AS Modelo, c.Nombre AS Categoria, a.Nombre, a.Cantidad
    FROM Repuesto a
    INNER JOIN ModeloEquipo m ON m.IdModelo = a.IdModelo
    INNER JOIN CategoriaEquipo c ON c.IdCategoria = m.IdCategoria
    ORDER BY m.Marca, m.Modelo, a.Nombre;
END
