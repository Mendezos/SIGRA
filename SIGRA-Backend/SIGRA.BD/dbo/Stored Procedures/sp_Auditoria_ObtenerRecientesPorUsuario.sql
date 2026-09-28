CREATE PROCEDURE sp_Auditoria_ObtenerRecientesPorUsuario
    @IdUsuario INT,
    @Top INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP (@Top) IdAuditoria, IdUsuario, Modulo, Entidad, IdEntidad, Accion, Fecha, Detalle
    FROM Auditoria
    WHERE IdUsuario = @IdUsuario
    ORDER BY Fecha DESC;
END
