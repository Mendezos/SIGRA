CREATE PROCEDURE sp_Equipo_TieneContratoActivo
    @IdEquipo INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM ContratoEquipo ce
        INNER JOIN Contrato c ON c.IdContrato = ce.IdContrato
        WHERE ce.IdEquipo = @IdEquipo AND ce.FechaDevolucion IS NULL AND c.Estado IN ('Activo', 'Renovado', 'Vencido')
    ) THEN 1 ELSE 0 END;
END
