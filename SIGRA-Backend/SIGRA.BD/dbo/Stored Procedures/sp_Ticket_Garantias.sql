CREATE PROCEDURE [dbo].[sp_Ticket_Garantias] @Filtro NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Cliente INT=TRY_CONVERT(INT,JSON_VALUE(@Filtro,'$.idCliente')),
        @Proveedor NVARCHAR(150)=JSON_VALUE(@Filtro,'$.proveedor'),
        @Desde DATE=TRY_CONVERT(DATE,JSON_VALUE(@Filtro,'$.desde')),
        @Hasta DATE=TRY_CONVERT(DATE,JSON_VALUE(@Filtro,'$.hasta'));
    SELECT ga.IdGarantia,ga.IdTicket,g.NumeroBoleta,g.Empresa,te.NumeroSerie,
           CONCAT(te.Marca,N' ',te.Modelo) AS Equipo,ga.Proveedor,ga.CasoProveedor,
           TODATETIMEOFFSET(ga.Fecha,'+00:00') AS Fecha,COALESCE(seguimiento.Estado,N'En trámite') AS Estado
    INTO #Garantias
    FROM GarantiaTicket ga INNER JOIN TicketGestion g ON g.IdTicket=ga.IdTicket
    INNER JOIN Ticket t ON t.IdTicket=ga.IdTicket INNER JOIN TicketEquipo te ON te.IdTicketEquipo=ga.IdTicketEquipo
    OUTER APPLY (SELECT TOP (1) Estado FROM GarantiaSeguimiento s WHERE s.IdGarantia=ga.IdGarantia ORDER BY s.IdSeguimiento DESC) seguimiento
    WHERE (@Cliente IS NULL OR t.IdCliente=@Cliente)
      AND (NULLIF(@Proveedor,N'') IS NULL OR ga.Proveedor LIKE '%' + @Proveedor + '%')
      AND (@Desde IS NULL OR CONVERT(DATE,DATEADD(HOUR,-6,ga.Fecha))>=@Desde)
      AND (@Hasta IS NULL OR CONVERT(DATE,DATEADD(HOUR,-6,ga.Fecha))<=@Hasta);
    SELECT * FROM #Garantias ORDER BY Fecha,NumeroBoleta,NumeroSerie;
    SELECT s.IdGarantia,TODATETIMEOFFSET(s.Fecha,'+00:00') AS Fecha,u.Nombre AS Usuario,s.Estado,s.Nota
    FROM GarantiaSeguimiento s INNER JOIN #Garantias ga ON ga.IdGarantia=s.IdGarantia
    INNER JOIN Usuario u ON u.IdUsuario=s.IdUsuario ORDER BY s.IdSeguimiento;
END;
