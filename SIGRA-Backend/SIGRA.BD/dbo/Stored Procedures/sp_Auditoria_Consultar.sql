CREATE PROCEDURE dbo.sp_Auditoria_Consultar
    @Entidad VARCHAR(100) = NULL,
    @IdEntidad INT = NULL,
    @IdUsuarioAfectado INT = NULL,
    @IdAutor INT = NULL,
    @Desde DATE = NULL,
    @Hasta DATE = NULL,
    @Accion VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @Desde > @Hasta
        THROW 50001, 'La fecha inicial no puede superar la final.', 1;

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
        ) AS IdUsuarioAfectado
    FROM dbo.Auditoria a
    LEFT JOIN dbo.Usuario u ON u.IdUsuario = a.IdUsuario
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
      AND (
          @Desde IS NULL
          OR a.Fecha >= DATEADD(HOUR, 6, CONVERT(DATETIME2, @Desde))
      )
      AND (
          @Hasta IS NULL
          OR a.Fecha < DATEADD(
              HOUR, 6, DATEADD(DAY, 1, CONVERT(DATETIME2, @Hasta))
          )
      )
    ORDER BY a.Fecha DESC, a.IdAuditoria DESC;
END;