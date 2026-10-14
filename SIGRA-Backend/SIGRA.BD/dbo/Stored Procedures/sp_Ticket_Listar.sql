CREATE PROCEDURE [dbo].[sp_Ticket_Listar] @Filtro NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Texto NVARCHAR(200) = JSON_VALUE(@Filtro, '$.texto'),
        @Cliente INT = TRY_CONVERT(INT, JSON_VALUE(@Filtro, '$.idCliente')),
        @Tecnico INT = TRY_CONVERT(INT, JSON_VALUE(@Filtro, '$.idTecnico')),
        @Tipo NVARCHAR(50) = JSON_VALUE(@Filtro, '$.tipoServicio'),
        @Estado NVARCHAR(30) = JSON_VALUE(@Filtro, '$.estado'),
        @Resolucion NVARCHAR(50) = JSON_VALUE(@Filtro, '$.resolucion'),
        @Desde DATE = TRY_CONVERT(DATE, JSON_VALUE(@Filtro, '$.desde')),
        @Hasta DATE = TRY_CONVERT(DATE, JSON_VALUE(@Filtro, '$.hasta')),
        @Inactivos BIT = CASE WHEN JSON_VALUE(@Filtro, '$.incluirInactivos') = 'true' THEN 1 ELSE 0 END,
        @SinRecepcion BIT = CASE WHEN JSON_VALUE(@Filtro, '$.sinRecepcionFisica') = 'true' THEN 1 ELSE 0 END,
        @Pagina INT = COALESCE(TRY_CONVERT(INT, JSON_VALUE(@Filtro, '$.pagina')), 1),
        @Tamano INT = COALESCE(TRY_CONVERT(INT, JSON_VALUE(@Filtro, '$.tamanoPagina')), 10);
    IF @Pagina < 1 OR @Tamano < 1 OR @Tamano > 100 THROW 50001, 'La paginación indicada no es válida.', 1;
    SELECT v.IdTicket INTO #Coincidencias FROM vw_TicketDetalle v
    WHERE (@Inactivos = 1 OR v.Activo = 1)
      AND (@Cliente IS NULL OR v.IdCliente = @Cliente)
      AND (@Tecnico IS NULL OR v.IdTecnicoAsignado = @Tecnico)
      AND (NULLIF(@Tipo, '') IS NULL OR v.TipoServicio = @Tipo)
      AND (NULLIF(@Estado, '') IS NULL OR v.Estado = @Estado)
      AND (NULLIF(@Resolucion, '') IS NULL OR JSON_VALUE(v.TrabajoJson, '$.resolucion') = @Resolucion)
      AND (@Desde IS NULL OR CONVERT(DATE, SWITCHOFFSET(v.FechaRecepcion, '-06:00')) >= @Desde)
      AND (@Hasta IS NULL OR CONVERT(DATE, SWITCHOFFSET(v.FechaRecepcion, '-06:00')) <= @Hasta)
      AND (@SinRecepcion = 0 OR (v.FechaRecepcionFisica IS NULL AND v.Estado IN ('Creada', 'Asignada')))
      AND (NULLIF(@Texto, '') IS NULL OR v.Empresa LIKE '%' + @Texto + '%'
           OR v.Contacto LIKE '%' + @Texto + '%' OR CONVERT(VARCHAR(20), v.NumeroBoleta) LIKE '%' + @Texto + '%'
           OR v.CodigoSeguimiento LIKE '%' + @Texto + '%'
           OR EXISTS (SELECT 1 FROM TicketEquipo te WHERE te.IdTicket = v.IdTicket AND te.NumeroSerie LIKE '%' + @Texto + '%'));
    SELECT v.* FROM vw_TicketDetalle v INNER JOIN #Coincidencias c ON c.IdTicket = v.IdTicket
    ORDER BY v.NumeroBoleta DESC OFFSET ((@Pagina - 1) * @Tamano) ROWS FETCH NEXT @Tamano ROWS ONLY;
    SELECT COUNT(*) FROM #Coincidencias;
END;
