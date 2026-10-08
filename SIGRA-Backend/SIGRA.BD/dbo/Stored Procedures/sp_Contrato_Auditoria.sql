CREATE PROCEDURE sp_Contrato_Auditoria
    @IdContrato INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT a.IdAuditoria, a.Fecha, a.Accion, a.Detalle, COALESCE(u.Nombre, 'Sistema') AS Usuario
    FROM Auditoria a
    LEFT JOIN Usuario u ON u.IdUsuario = a.IdUsuario
    WHERE a.Modulo = 'Alquiler' AND a.Entidad = 'Contrato' AND a.IdEntidad = @IdContrato
    ORDER BY a.Fecha DESC, a.IdAuditoria DESC;
END
