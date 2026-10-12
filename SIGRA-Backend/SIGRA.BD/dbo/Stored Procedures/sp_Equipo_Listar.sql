CREATE PROCEDURE sp_Equipo_Listar
    @Texto       VARCHAR(100) = NULL,
    @IdCategoria INT = NULL,
    @Estado      VARCHAR(30) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT e.IdEquipo, e.NumeroSerie, m.IdModelo, m.Marca, m.Modelo,
           c.IdCategoria, c.Nombre AS Categoria, e.Estado, e.Propietario, e.Ubicacion,
           e.FechaAdquisicion, e.CostoCompra, e.Cantidad, p.Nombre AS Proveedor,
           CASE WHEN e.Foto IS NULL THEN 0 ELSE 1 END AS TieneFoto
    FROM Equipo e
    INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    INNER JOIN CategoriaEquipo c ON c.IdCategoria = m.IdCategoria
    INNER JOIN Proveedor p ON p.IdProveedor = e.IdProveedor
    WHERE (@IdCategoria IS NULL OR c.IdCategoria = @IdCategoria)
      AND (@Estado IS NULL OR e.Estado = @Estado)
      AND (@Texto IS NULL
           OR e.NumeroSerie LIKE '%' + @Texto + '%'
           OR m.Marca LIKE '%' + @Texto + '%'
           OR m.Modelo LIKE '%' + @Texto + '%')
    ORDER BY e.IdEquipo DESC;
END
