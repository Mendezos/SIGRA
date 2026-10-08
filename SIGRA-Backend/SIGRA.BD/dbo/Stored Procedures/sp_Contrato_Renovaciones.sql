CREATE PROCEDURE sp_Contrato_Renovaciones
    @IdContrato INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT r.FechaRenovacion, u.Nombre AS Usuario, r.FechaVencimientoAnterior, r.NuevaFechaVencimiento,
           r.MontoMensual, r.Observacion
    FROM RenovacionContrato r
    LEFT JOIN Usuario u ON u.IdUsuario = r.IdUsuario
    WHERE r.IdContrato = @IdContrato
    ORDER BY r.IdRenovacion DESC;
END
