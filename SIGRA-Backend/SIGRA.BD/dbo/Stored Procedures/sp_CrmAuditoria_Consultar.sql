-- CRMGPSC-026: historial de cambios del CRM (prospectos, clientes, contactos, notas, interacciones y seguimientos) para el administrador.
-- Filtros opcionales: entidad, identificador del registro, autor, acción, empresa (texto), vendedor responsable y rango de fechas.
-- Devuelve dos conjuntos: los datos de la paginación y la página de eventos (el más reciente primero).
CREATE PROCEDURE [dbo].[sp_CrmAuditoria_Consultar]
    @Entidad      VARCHAR(100) = NULL,
    @IdEntidad    INT          = NULL,
    @IdAutor      INT          = NULL,
    @Accion       VARCHAR(50)  = NULL,
    @Empresa      VARCHAR(150) = NULL,
    @IdVendedor   INT          = NULL,
    @Desde        DATE         = NULL,
    @Hasta        DATE         = NULL,
    @Pagina       INT          = 1,
    @TamanoPagina INT          = 15
AS
BEGIN
    SET NOCOUNT ON;
    IF @Desde IS NOT NULL AND @Hasta IS NOT NULL AND @Desde > @Hasta
        THROW 50001, 'La fecha inicial no puede ser posterior a la final.', 1;

    SET @TamanoPagina = CASE WHEN @TamanoPagina IS NULL OR @TamanoPagina < 1 THEN 15 WHEN @TamanoPagina > 100 THEN 100 ELSE @TamanoPagina END;
    DECLARE @DesdeF DATETIME2 = CASE WHEN @Desde IS NULL THEN NULL ELSE CONVERT(DATETIME2, @Desde) END;
    DECLARE @HastaF DATETIME2 = CASE WHEN @Hasta IS NULL THEN NULL ELSE DATEADD(DAY, 1, CONVERT(DATETIME2, @Hasta)) END;

    SELECT * INTO #Eventos
    FROM dbo.vw_CrmAuditoria v
    WHERE (@Entidad IS NULL OR v.Entidad = @Entidad)
      AND (@IdEntidad IS NULL OR v.IdEntidad = @IdEntidad)
      AND (@IdAutor IS NULL OR v.IdAutor = @IdAutor)
      AND (@Accion IS NULL OR v.Accion = @Accion)
      AND (@Empresa IS NULL OR v.Empresa LIKE '%' + @Empresa + '%')
      AND (@IdVendedor IS NULL OR v.IdVendedor = @IdVendedor)
      AND (@DesdeF IS NULL OR v.Fecha >= @DesdeF)
      AND (@HastaF IS NULL OR v.Fecha < @HastaF);

    DECLARE @Total INT = (SELECT COUNT(*) FROM #Eventos);
    DECLARE @MaxPagina INT = CASE WHEN @Total = 0 THEN 1 ELSE (@Total + @TamanoPagina - 1) / @TamanoPagina END;
    SET @Pagina = CASE WHEN @Pagina IS NULL OR @Pagina < 1 THEN 1 WHEN @Pagina > @MaxPagina THEN @MaxPagina ELSE @Pagina END;

    SELECT @Total AS Total, @Pagina AS Pagina, @TamanoPagina AS TamanoPagina;

    SELECT IdAuditoria, Entidad, IdEntidad, Accion, Detalle, IdAutor, Autor, Fecha, Empresa, Vendedor
    FROM #Eventos
    ORDER BY Fecha DESC, IdAuditoria DESC
    OFFSET (@Pagina - 1) * @TamanoPagina ROWS FETCH NEXT @TamanoPagina ROWS ONLY;
END
