CREATE PROCEDURE sp_PlantillaContrato_Listar
    @Texto       VARCHAR(120) = NULL,
    @IdCategoria INT = NULL,
    @Estado      VARCHAR(10) = NULL   -- 'Activa' o 'Inactiva'
AS
BEGIN
    SET NOCOUNT ON;

    SELECT p.IdPlantilla AS Id, p.Nombre, p.IdCategoria, ISNULL(c.Nombre, N'Cualquier equipo') AS TipoEquipo,
           p.VersionActual, p.Activa, p.FechaCreacion
    FROM PlantillaContrato p
    LEFT JOIN CategoriaEquipo c ON c.IdCategoria = p.IdCategoria
    WHERE (@Texto IS NULL OR p.Nombre LIKE N'%' + @Texto + N'%')
      AND (@IdCategoria IS NULL OR p.IdCategoria = @IdCategoria)
      AND (@Estado IS NULL OR p.Activa = CASE WHEN @Estado = 'Activa' THEN 1 ELSE 0 END)
    ORDER BY p.Activa DESC, p.Nombre;
END
