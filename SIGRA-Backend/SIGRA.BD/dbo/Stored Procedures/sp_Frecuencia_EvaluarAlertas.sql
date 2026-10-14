CREATE PROCEDURE sp_Frecuencia_EvaluarAlertas
    @Hoy DATE = NULL   -- solo para pruebas; por defecto es la fecha actual del sistema
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @Hoy = ISNULL(@Hoy, CAST(GETDATE() AS DATE));

    DECLARE @Nuevas TABLE (IdAlerta INT);
    DECLARE @Vencidas TABLE (IdSolicitud INT);

    BEGIN TRANSACTION;

    -- 1) Frecuencias que llegaron a su fecha de vencimiento sin renovarse pasan a "Vencida"
    --    (incluye las "En renovación" cuya renovación todavía no fue otorgada). Las canceladas no se tocan.
    UPDATE SolicitudFrecuencia
    SET Estado = 'Vencida'
    OUTPUT inserted.IdSolicitud INTO @Vencidas
    WHERE Estado IN ('Vigente', 'Por renovar', 'En renovación') AND FechaVencimiento IS NOT NULL AND FechaVencimiento <= @Hoy;

    -- 2) Alertas: se genera, como máximo, la más urgente que corresponde a cada frecuencia y que aún no existe.
    --    Final (30 días) y Segunda (3 meses) solo aplican si no hay una renovación en trámite; Primera (6 meses) siempre.
    --    Una frecuencia "En renovación" ya tiene la renovación iniciada y una "Cancelada" no genera alertas.
    WITH Candidatas AS (
        SELECT s.IdSolicitud, s.IdUsuario, s.FechaVencimiento,
               CASE WHEN EXISTS (SELECT 1 FROM SolicitudFrecuencia r WHERE r.IdSolicitudOrigen = s.IdSolicitud AND r.Estado <> 'Cancelada') THEN 1 ELSE 0 END AS TieneRenovacion
        FROM SolicitudFrecuencia s
        WHERE s.Estado IN ('Vigente', 'Por renovar') AND s.FechaVencimiento > @Hoy
    ),
    Tipificadas AS (
        SELECT c.*,
               CASE WHEN c.TieneRenovacion = 0 AND @Hoy >= DATEADD(DAY, -30, c.FechaVencimiento) THEN 'Final'
                    WHEN c.TieneRenovacion = 0 AND @Hoy >= DATEADD(MONTH, -3, c.FechaVencimiento) THEN 'Segunda'
                    WHEN @Hoy >= DATEADD(MONTH, -6, c.FechaVencimiento) THEN 'Primera'
               END AS Tipo
        FROM Candidatas c
    )
    INSERT INTO AlertaFrecuencia (IdSolicitud, Tipo, FechaAlerta, FechaVencimiento, IdVendedor)
    OUTPUT inserted.IdAlerta INTO @Nuevas
    SELECT t.IdSolicitud, t.Tipo, @Hoy, t.FechaVencimiento, t.IdUsuario
    FROM Tipificadas t
    WHERE t.Tipo IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM AlertaFrecuencia a WHERE a.IdSolicitud = t.IdSolicitud AND a.Tipo = t.Tipo);

    -- 3) La frecuencia alertada pasa de "Vigente" a "Por renovar".
    UPDATE s
    SET s.Estado = 'Por renovar'
    FROM SolicitudFrecuencia s
    WHERE s.Estado = 'Vigente'
      AND EXISTS (SELECT 1 FROM AlertaFrecuencia a INNER JOIN @Nuevas n ON n.IdAlerta = a.IdAlerta WHERE a.IdSolicitud = s.IdSolicitud);

    COMMIT TRANSACTION;

    SELECT IdAlerta FROM @Nuevas;
    SELECT IdSolicitud FROM @Vencidas;
END
