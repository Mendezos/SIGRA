CREATE PROCEDURE [dbo].[sp_Ticket_Auditoria] @Filtro NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Numero BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@Filtro,'$.numeroBoleta')),
        @Usuario INT=TRY_CONVERT(INT,JSON_VALUE(@Filtro,'$.idUsuario')),
        @Desde DATE=TRY_CONVERT(DATE,JSON_VALUE(@Filtro,'$.desde')),
        @Hasta DATE=TRY_CONVERT(DATE,JSON_VALUE(@Filtro,'$.hasta'));
    SELECT a.IdAuditoria,g.NumeroBoleta,u.Nombre AS Usuario,TODATETIMEOFFSET(a.Fecha,'+00:00') AS Fecha,a.Accion,a.Detalle
    FROM Auditoria a INNER JOIN TicketGestion g ON g.IdTicket=a.IdEntidad
    LEFT JOIN Usuario u ON u.IdUsuario=a.IdUsuario
    WHERE a.Modulo='GTST' AND a.Entidad='Ticket'
      AND (@Numero IS NULL OR g.NumeroBoleta=@Numero) AND (@Usuario IS NULL OR a.IdUsuario=@Usuario)
      AND (@Desde IS NULL OR CONVERT(DATE,DATEADD(HOUR,-6,a.Fecha))>=@Desde)
      AND (@Hasta IS NULL OR CONVERT(DATE,DATEADD(HOUR,-6,a.Fecha))<=@Hasta)
    ORDER BY a.Fecha DESC,a.IdAuditoria DESC;
END;
