-- Devuelve tres resultados: la plantilla con su versión vigente, el historial de versiones y el historial de estados.
-- Con @Version se obtiene el contenido de una versión anterior (los contratos conservan la versión con la que se hicieron).
CREATE PROCEDURE sp_PlantillaContrato_Obtener
    @IdPlantilla INT,
    @Version     INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT p.IdPlantilla AS Id, p.Nombre, p.IdCategoria, ISNULL(c.Nombre, N'Cualquier equipo') AS TipoEquipo,
           p.VersionActual, p.Activa, p.FechaCreacion,
           v.Version AS VersionMostrada, v.Clausulas, v.Responsabilidades, v.CondicionesCancelacion
    FROM PlantillaContrato p
    LEFT JOIN CategoriaEquipo c ON c.IdCategoria = p.IdCategoria
    INNER JOIN PlantillaContratoVersion v ON v.IdPlantilla = p.IdPlantilla AND v.Version = ISNULL(@Version, p.VersionActual)
    WHERE p.IdPlantilla = @IdPlantilla;

    SELECT v.Version, v.Motivo, u.Nombre AS Usuario, v.Fecha
    FROM PlantillaContratoVersion v
    INNER JOIN Usuario u ON u.IdUsuario = v.IdUsuario
    WHERE v.IdPlantilla = @IdPlantilla
    ORDER BY v.Version DESC;

    SELECT e.Activa, e.Motivo, u.Nombre AS Usuario, e.Fecha
    FROM PlantillaContratoEstado e
    INNER JOIN Usuario u ON u.IdUsuario = e.IdUsuario
    WHERE e.IdPlantilla = @IdPlantilla
    ORDER BY e.Fecha DESC, e.IdCambio DESC;
END
