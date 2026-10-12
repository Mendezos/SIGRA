CREATE PROCEDURE sp_Equipo_Obtener
    @IdEquipo    INT = NULL,
    @NumeroSerie VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT e.IdEquipo, e.NumeroSerie, m.IdModelo, m.Marca, m.Modelo, m.DescripcionTecnica,
           c.IdCategoria, c.Nombre AS Categoria, c.ManejaCantidad, e.Estado, e.Propietario, e.Ubicacion,
           e.FechaAdquisicion, e.CostoCompra, e.Cantidad, e.FechaBaja, e.MotivoBaja, e.Foto,
           p.IdProveedor, p.Nombre AS Proveedor
    FROM Equipo e
    INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    INNER JOIN CategoriaEquipo c ON c.IdCategoria = m.IdCategoria
    INNER JOIN Proveedor p ON p.IdProveedor = e.IdProveedor
    WHERE (@IdEquipo IS NOT NULL AND e.IdEquipo = @IdEquipo)
       OR (@IdEquipo IS NULL AND @NumeroSerie IS NOT NULL AND e.NumeroSerie = @NumeroSerie);
END
