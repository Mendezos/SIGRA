CREATE PROCEDURE sp_Checklist_Obtener
    @IdEquipo INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdUltimo INT = (SELECT TOP 1 IdChecklist FROM ChecklistInstalacion WHERE IdEquipo = @IdEquipo ORDER BY IdChecklist DESC);

    -- 1) Requisitos vigentes con el resultado de la última verificación (no cumplido si no hay verificación).
    SELECT r.IdRequisito, r.Nombre, CAST(ISNULL(i.Cumplido, 0) AS BIT) AS Cumplido
    FROM RequisitoInstalacion r
    LEFT JOIN ChecklistInstalacionItem i ON i.IdRequisito = r.IdRequisito AND i.IdChecklist = @IdUltimo
    WHERE r.Activo = 1
    ORDER BY r.Orden, r.IdRequisito;

    -- 2) Última verificación
    SELECT c.IdChecklist, c.FechaVerificacion, c.Completado, c.Observaciones, u.Nombre AS Usuario,
           (SELECT COUNT(*) FROM ChecklistInstalacionItem x WHERE x.IdChecklist = c.IdChecklist AND x.Cumplido = 0) AS Pendientes
    FROM ChecklistInstalacion c
    LEFT JOIN Usuario u ON u.IdUsuario = c.IdUsuario
    WHERE c.IdChecklist = @IdUltimo;

    -- 3) Historial de verificaciones
    SELECT TOP 20 c.IdChecklist, c.FechaVerificacion, c.Completado, c.Observaciones, u.Nombre AS Usuario,
           (SELECT COUNT(*) FROM ChecklistInstalacionItem x WHERE x.IdChecklist = c.IdChecklist AND x.Cumplido = 0) AS Pendientes
    FROM ChecklistInstalacion c
    LEFT JOIN Usuario u ON u.IdUsuario = c.IdUsuario
    WHERE c.IdEquipo = @IdEquipo
    ORDER BY c.IdChecklist DESC;
END
