CREATE PROCEDURE dbo.sp_Auditoria_Consultar
    @Entidad VARCHAR(100) = NULL,
    @IdEntidad INT = NULL,
    @IdUsuarioAfectado INT = NULL,
    @IdAutor INT = NULL,
    @Desde DATE = NULL,
    @Hasta DATE = NULL,
    @Accion VARCHAR(50) = NULL,
    @Pagina INT = 1,
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    IF @Desde > @Hasta
        THROW 50001, 'La fecha inicial no puede superar la final.', 1;

    SET @TamanoPagina = CASE
        WHEN @TamanoPagina IS NULL OR @TamanoPagina < 1 THEN 10
        WHEN @TamanoPagina > 100 THEN 100
        ELSE @TamanoPagina
    END;

    DECLARE @DesdeUtc DATETIME2 =
        CASE WHEN @Desde IS NULL THEN NULL
             ELSE DATEADD(HOUR, 6, CONVERT(DATETIME2, @Desde)) END;

    DECLARE @HastaUtc DATETIME2 =
        CASE WHEN @Hasta IS NULL THEN NULL
             ELSE DATEADD(HOUR, 6, DATEADD(DAY, 1, CONVERT(DATETIME2, @Hasta))) END;

    DECLARE @Total INT;

    SELECT @Total = COUNT(*)
    FROM dbo.Auditoria a
    WHERE (@Entidad IS NULL OR a.Entidad = @Entidad)
      AND (@IdEntidad IS NULL OR a.IdEntidad = @IdEntidad)
      AND (
          @IdUsuarioAfectado IS NULL
          OR COALESCE(
              a.IdUsuarioAfectado,
              CASE WHEN a.Entidad = 'Usuario' THEN a.IdEntidad END
          ) = @IdUsuarioAfectado
      )
      AND (@IdAutor IS NULL OR a.IdUsuario = @IdAutor)
      AND (@Accion IS NULL OR a.Accion = @Accion)
      AND (@DesdeUtc IS NULL OR a.Fecha >= @DesdeUtc)
      AND (@HastaUtc IS NULL OR a.Fecha < @HastaUtc);

    DECLARE @MaxPagina INT = CASE
        WHEN @Total = 0 THEN 1
        ELSE (@Total + @TamanoPagina - 1) / @TamanoPagina
    END;

    SET @Pagina = CASE
        WHEN @Pagina IS NULL OR @Pagina < 1 THEN 1
        WHEN @Pagina > @MaxPagina THEN @MaxPagina
        ELSE @Pagina
    END;

    -- Primer conjunto de resultados: datos de la paginación.
    SELECT @Total AS Total, @Pagina AS Pagina, @TamanoPagina AS TamanoPagina;

    -- Segundo conjunto: la página solicitada.
    SELECT
        a.IdAuditoria,
        a.Modulo,
        a.Entidad,
        a.IdEntidad,
        a.Accion,
        a.Fecha,
        a.Detalle,
        a.IdUsuario AS IdAutor,
        COALESCE(u.Nombre, 'Sistema') AS Autor,
        COALESCE(
            a.IdUsuarioAfectado,
            CASE WHEN a.Entidad = 'Usuario' THEN a.IdEntidad END
        ) AS IdUsuarioAfectado,
        COALESCE(ua.Nombre, r.Nombre) AS Objetivo
    FROM dbo.Auditoria a
    LEFT JOIN dbo.Usuario u ON u.IdUsuario = a.IdUsuario
    LEFT JOIN dbo.Usuario ua
        ON ua.IdUsuario = COALESCE(
            a.IdUsuarioAfectado,
            CASE WHEN a.Entidad = 'Usuario' THEN a.IdEntidad END
        )
    LEFT JOIN dbo.Rol r ON a.Entidad = 'Rol' AND r.IdRol = a.IdEntidad
    WHERE (@Entidad IS NULL OR a.Entidad = @Entidad)
      AND (@IdEntidad IS NULL OR a.IdEntidad = @IdEntidad)
      AND (
          @IdUsuarioAfectado IS NULL
          OR COALESCE(
              a.IdUsuarioAfectado,
              CASE WHEN a.Entidad = 'Usuario' THEN a.IdEntidad END
          ) = @IdUsuarioAfectado
      )
      AND (@IdAutor IS NULL OR a.IdUsuario = @IdAutor)
      AND (@Accion IS NULL OR a.Accion = @Accion)
      AND (@DesdeUtc IS NULL OR a.Fecha >= @DesdeUtc)
      AND (@HastaUtc IS NULL OR a.Fecha < @HastaUtc)
    ORDER BY a.Fecha DESC, a.IdAuditoria DESC
    OFFSET (@Pagina - 1) * @TamanoPagina ROWS
    FETCH NEXT @TamanoPagina ROWS ONLY;
END;
