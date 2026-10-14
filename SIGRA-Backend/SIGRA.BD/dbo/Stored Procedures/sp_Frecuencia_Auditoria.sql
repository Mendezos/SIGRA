CREATE PROCEDURE sp_Frecuencia_Auditoria
    @IdSolicitud INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Fecha está en UTC. Los eventos automáticos (alertas, vencimientos) no tienen usuario.
    SELECT a.IdAuditoria, a.Fecha, a.IdUsuario, u.Nombre AS Usuario, r.Nombre AS Rol, a.Accion, a.Detalle
    FROM Auditoria a
    LEFT JOIN Usuario u ON u.IdUsuario = a.IdUsuario
    LEFT JOIN Rol r ON r.IdRol = u.IdRol
    WHERE a.Entidad = 'SolicitudFrecuencia' AND a.IdEntidad = @IdSolicitud
    ORDER BY a.Fecha, a.IdAuditoria;
END
