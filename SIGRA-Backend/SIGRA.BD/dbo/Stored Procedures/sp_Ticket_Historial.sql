CREATE PROCEDURE [dbo].[sp_Ticket_Historial] @Filtro NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @IdTicket INT=TRY_CONVERT(INT,JSON_VALUE(@Filtro,'$.idTicket')),
        @IdCliente INT=TRY_CONVERT(INT,JSON_VALUE(@Filtro,'$.idCliente')),
        @Serie NVARCHAR(50)=JSON_VALUE(@Filtro,'$.numeroSerie'),
        @Desde DATE=TRY_CONVERT(DATE,JSON_VALUE(@Filtro,'$.desde')),
        @Hasta DATE=TRY_CONVERT(DATE,JSON_VALUE(@Filtro,'$.hasta'));
    SELECT v.FechaRecepcion AS Fecha,v.NumeroBoleta,v.Empresa,
           COALESCE(te.NumeroSerie,e.NumeroSerie) AS NumeroSerie,v.TipoServicio,v.Tecnico,
           JSON_VALUE(v.TrabajoJson,'$.resolucion') AS Resolucion,
           COALESCE((SELECT Texto FROM OPENJSON(v.TrabajoJson) WITH(Texto NVARCHAR(MAX) '$.observaciones')),(SELECT Texto FROM OPENJSON(v.TrabajoJson) WITH(Texto NVARCHAR(MAX) '$.detallesTrabajo')),te.Problema) AS Observaciones
    FROM vw_TicketDetalle v INNER JOIN TicketEquipo te ON te.IdTicket=v.IdTicket
    LEFT JOIN Equipo e ON e.IdEquipo=te.IdEquipo
    WHERE (@IdTicket IS NULL OR v.IdTicket=@IdTicket) AND (@IdCliente IS NULL OR v.IdCliente=@IdCliente)
      AND (NULLIF(@Serie,N'') IS NULL OR COALESCE(te.NumeroSerie,e.NumeroSerie)=@Serie)
      AND (@Desde IS NULL OR CONVERT(DATE,SWITCHOFFSET(v.FechaRecepcion,'-06:00'))>=@Desde)
      AND (@Hasta IS NULL OR CONVERT(DATE,SWITCHOFFSET(v.FechaRecepcion,'-06:00'))<=@Hasta)
    ORDER BY NumeroSerie,v.FechaRecepcion,v.NumeroBoleta;
END;
