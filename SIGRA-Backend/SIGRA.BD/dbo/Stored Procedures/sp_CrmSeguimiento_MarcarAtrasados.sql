-- Un seguimiento "Pendiente" cuya fecha y hora ya pasó (hora de Costa Rica) pasa a "Atrasado".
-- Lo ejecutan la agenda (CRMGPSC-016) cada vez que se abre y el servicio de recordatorios. Es idempotente.
-- Devuelve cuántos seguimientos se marcaron.
CREATE PROCEDURE [dbo].[sp_CrmSeguimiento_MarcarAtrasados]
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE SeguimientoCRM
    SET Estado = 'Atrasado'
    WHERE Estado = 'Pendiente' AND FechaHora < dbo.fn_CrmAhora();

    SELECT @@ROWCOUNT AS Marcados;
END
