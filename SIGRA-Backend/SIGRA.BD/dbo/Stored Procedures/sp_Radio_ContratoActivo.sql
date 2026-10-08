CREATE PROCEDURE sp_Radio_ContratoActivo
    @IdEquipo INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM ContratoEquipo ce
        INNER JOIN Contrato c ON c.IdContrato = ce.IdContrato
        WHERE ce.IdEquipo = @IdEquipo AND c.Estado = 'Activo'
    ) THEN 1 ELSE 0 END;
END
