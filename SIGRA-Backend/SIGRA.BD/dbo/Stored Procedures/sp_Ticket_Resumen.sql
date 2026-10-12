CREATE PROCEDURE [dbo].[sp_Ticket_Resumen] @IdTecnico INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Mes DATE = DATEFROMPARTS(YEAR(DATEADD(HOUR, -6, SYSUTCDATETIME())), MONTH(DATEADD(HOUR, -6, SYSUTCDATETIME())), 1);
    SELECT COALESCE(SUM(CASE WHEN Estado IN ('Creada','Asignada','En proceso') THEN 1 ELSE 0 END),0) AS Abiertas,
           COALESCE(SUM(CASE WHEN Estado = 'En proceso' THEN 1 ELSE 0 END),0) AS EnProceso,
           COALESCE(SUM(CASE WHEN Estado = 'Cerrada' AND CONVERT(DATE, SWITCHOFFSET(FechaCierre, '-06:00')) >= @Mes THEN 1 ELSE 0 END),0) AS CerradasMes
    FROM vw_TicketDetalle WHERE Activo = 1 AND (@IdTecnico IS NULL OR IdTecnicoAsignado = @IdTecnico);
END;
