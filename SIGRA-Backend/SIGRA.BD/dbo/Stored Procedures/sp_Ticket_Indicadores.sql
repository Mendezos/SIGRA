CREATE PROCEDURE [dbo].[sp_Ticket_Indicadores] @Desde DATE=NULL, @Hasta DATE=NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @Desde>@Hasta THROW 50001, 'La fecha inicial no puede ser posterior a la fecha final', 1;
    SELECT g.IdTecnicoCierre AS IdTecnico,u.Nombre AS Tecnico,COUNT(*) AS Cerradas,
           SUM(CASE WHEN JSON_VALUE(g.TrabajoJson,'$.resolucion')=N'Reparado' THEN 1 ELSE 0 END) AS Reparadas,
           SUM(CASE WHEN JSON_VALUE(g.TrabajoJson,'$.resolucion')=N'No reparado' THEN 1 ELSE 0 END) AS NoReparadas,
           SUM(CASE WHEN JSON_VALUE(g.TrabajoJson,'$.resolucion')=N'Garantía' THEN 1 ELSE 0 END) AS Garantias,
           100.0*SUM(CASE WHEN JSON_VALUE(g.TrabajoJson,'$.resolucion')=N'Reparado' THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0) AS TasaExito,
           AVG(CASE WHEN g.FechaInicio IS NOT NULL THEN CONVERT(FLOAT,DATEDIFF_BIG(SECOND,g.FechaInicio,g.FechaCierre))/3600.0 END) AS PromedioHoras,
           AVG(CASE WHEN g.FechaInicio IS NOT NULL THEN CASE WHEN DATEDIFF_BIG(SECOND,g.FechaInicio,g.FechaCierre)>COALESCE(espera.Segundos,0)
                    THEN CONVERT(FLOAT,DATEDIFF_BIG(SECOND,g.FechaInicio,g.FechaCierre)-COALESCE(espera.Segundos,0))/3600.0 ELSE 0.0 END END) AS PromedioHorasActivas
    FROM TicketGestion g INNER JOIN Ticket t ON t.IdTicket=g.IdTicket INNER JOIN Usuario u ON u.IdUsuario=g.IdTecnicoCierre
    OUTER APPLY (SELECT SUM(intervalo.Segundos) AS Segundos FROM TicketEsperaRepuesto e CROSS APPLY (SELECT DATEDIFF_BIG(SECOND,e.Inicio,COALESCE(e.Fin,g.FechaCierre)) AS Segundos) intervalo WHERE e.IdTicket=g.IdTicket) espera
    WHERE t.Estado='Cerrada' AND g.FechaCierre IS NOT NULL
      AND (@Desde IS NULL OR CONVERT(DATE,DATEADD(HOUR,-6,g.FechaCierre))>=@Desde)
      AND (@Hasta IS NULL OR CONVERT(DATE,DATEADD(HOUR,-6,g.FechaCierre))<=@Hasta)
    GROUP BY g.IdTecnicoCierre,u.Nombre ORDER BY u.Nombre;
    SELECT LTRIM(RTRIM(motivo.Texto)) COLLATE Latin1_General_100_CI_AI AS Motivo,COUNT(*) AS Cantidad
    FROM TicketGestion g INNER JOIN Ticket t ON t.IdTicket=g.IdTicket
    OUTER APPLY OPENJSON(g.TrabajoJson) WITH(Texto NVARCHAR(MAX) '$.justificacionTecnica') motivo
    WHERE t.Estado='Cerrada' AND JSON_VALUE(g.TrabajoJson,'$.resolucion')=N'No reparado'
      AND (@Desde IS NULL OR CONVERT(DATE,DATEADD(HOUR,-6,g.FechaCierre))>=@Desde)
      AND (@Hasta IS NULL OR CONVERT(DATE,DATEADD(HOUR,-6,g.FechaCierre))<=@Hasta)
    GROUP BY LTRIM(RTRIM(motivo.Texto)) COLLATE Latin1_General_100_CI_AI
    ORDER BY Cantidad DESC,Motivo;
END;
