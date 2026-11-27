-- DAR-013, 014, 016, 017, 020, 021 y 022: panel de taller y boletas.
-- Las fechas de las boletas se guardan en UTC y se convierten a hora de Costa Rica para agrupar y contar días.
-- Filtros: @IdTecnico (reparaciones, cerradas por mes y resoluciones), @TipoServicio (ranking), @Desde/@Hasta (cerradas, resoluciones y carga).
-- Sin fechas: cerradas y resoluciones muestran los últimos 12 meses y la carga, el mes en curso.
CREATE PROCEDURE [dbo].[sp_Dashboard_Taller]
    @IdTecnico    INT          = NULL,
    @TipoServicio NVARCHAR(50) = NULL,
    @Desde        DATE         = NULL,
    @Hasta        DATE         = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Hoy DATE = dbo.fn_HoyCR();
    IF @Desde IS NOT NULL AND @Hasta IS NOT NULL AND @Desde > @Hasta
        THROW 50001, 'El rango de fechas ingresado no es válido.', 1;
    DECLARE @H DATE = ISNULL(@Hasta, @Hoy);
    DECLARE @D DATE = ISNULL(@Desde, DATEADD(MONTH, -11, DATEFROMPARTS(YEAR(@H), MONTH(@H), 1)));
    DECLARE @DCarga DATE = ISNULL(@Desde, DATEFROMPARTS(YEAR(@H), MONTH(@H), 1));

    DECLARE @CargaMaxima INT, @DiasHabiles INT;
    SELECT TOP 1 @CargaMaxima = CargaMaxima, @DiasHabiles = DiasHabilesEstimados FROM ConfiguracionTickets;
    SET @CargaMaxima = ISNULL(@CargaMaxima, 5);
    SET @DiasHabiles = ISNULL(@DiasHabiles, 5);

    SELECT v.IdTicket, v.NumeroBoleta, v.Empresa, v.TipoServicio, v.Estado, v.IdTecnicoAsignado, v.Tecnico, v.EsReparacion, v.TrabajoJson,
           CAST(SWITCHOFFSET(v.FechaRecepcion, '-06:00') AS DATE) AS Recibida,
           CAST(SWITCHOFFSET(v.FechaAsignacion, '-06:00') AS DATE) AS Asignada,
           CAST(SWITCHOFFSET(v.FechaCierre, '-06:00') AS DATE) AS Cerrada,
           CAST(SWITCHOFFSET(v.FechaEstimada, '-06:00') AS DATE) AS Estimada,
           CAST(CASE WHEN EXISTS (SELECT 1 FROM TicketEsperaRepuesto e WHERE e.IdTicket = v.IdTicket AND e.Fin IS NULL) THEN 1 ELSE 0 END AS BIT) AS EnEspera
    INTO #T
    FROM vw_TicketDetalle v
    WHERE v.Activo = 1;

    SELECT * INTO #Abiertas FROM #T WHERE Estado IN ('Creada', 'Asignada', 'En proceso');

    -- 1) Abiertas por tipo hoy y el mismo día de la semana anterior (según el historial de estados)
    DECLARE @Antes DATETIME = DATEADD(DAY, -7, GETUTCDATE());
    SELECT t.IdTicket, t.TipoServicio,
           CAST(CASE WHEN EXISTS (SELECT 1 FROM TicketEsperaRepuesto e WHERE e.IdTicket = t.IdTicket AND e.Inicio <= @Antes
                                  AND (e.Fin IS NULL OR e.Fin > @Antes)) THEN 1 ELSE 0 END AS BIT) AS EnEspera
    INTO #Antes
    FROM #T t
    CROSS APPLY (SELECT TOP 1 h.Estado FROM TicketEstadoHistorial h WHERE h.IdTicket = t.IdTicket AND h.FechaInicio <= @Antes
                 ORDER BY h.FechaInicio DESC, h.IdHistorial DESC) h
    WHERE h.Estado IN ('Creada', 'Asignada', 'En proceso');

    SELECT g.Grupo,
           (SELECT COUNT(*) FROM #Abiertas a WHERE (g.Grupo = 'espera' AND a.EnEspera = 1)
               OR (g.Grupo = 'mantenimiento' AND a.EnEspera = 0 AND a.TipoServicio LIKE 'Mantenimiento%')
               OR (g.Grupo = 'reparacion' AND a.EnEspera = 0 AND a.TipoServicio = N'Reparación')) AS Abiertas,
           (SELECT COUNT(*) FROM #Antes a WHERE (g.Grupo = 'espera' AND a.EnEspera = 1)
               OR (g.Grupo = 'mantenimiento' AND a.EnEspera = 0 AND a.TipoServicio LIKE 'Mantenimiento%')
               OR (g.Grupo = 'reparacion' AND a.EnEspera = 0 AND a.TipoServicio = N'Reparación')) AS SemanaAnterior
    FROM (VALUES (1, 'mantenimiento'), (2, 'reparacion'), (3, 'espera')) g(Orden, Grupo)
    ORDER BY g.Orden;

    -- 2) Reparaciones abiertas, las más antiguas primero
    SELECT a.IdTicket, a.NumeroBoleta, a.Empresa,
           (SELECT TOP 1 CONCAT(te.Marca, ' ', te.Modelo, ' · ', te.NumeroSerie) FROM TicketEquipo te WHERE te.IdTicket = a.IdTicket) AS Equipo,
           a.IdTecnicoAsignado AS IdTecnico, a.Tecnico,
           CASE WHEN a.EnEspera = 1 THEN N'En espera de repuesto' ELSE ISNULL(JSON_VALUE(a.TrabajoJson, '$.etapa'), a.Estado) END AS Etapa,
           DATEDIFF(DAY, ISNULL(a.Asignada, a.Recibida), @Hoy) AS Dias,
           CAST(CASE WHEN (a.Estimada IS NOT NULL AND a.Estimada < @Hoy) OR DATEDIFF(DAY, ISNULL(a.Asignada, a.Recibida), @Hoy) > @DiasHabiles THEN 1 ELSE 0 END AS BIT) AS Atrasada
    FROM #Abiertas a
    WHERE a.EsReparacion = 1 AND (@IdTecnico IS NULL OR a.IdTecnicoAsignado = @IdTecnico)
    ORDER BY Dias DESC, a.NumeroBoleta;

    -- 3) Ranking de técnicos por boletas abiertas
    SELECT u.IdUsuario AS IdTecnico, u.Nombre AS Tecnico,
           COUNT(a.IdTicket) AS Abiertas,
           @CargaMaxima AS Limite
    FROM Usuario u
    INNER JOIN Rol r ON r.IdRol = u.IdRol
    LEFT JOIN #Abiertas a ON a.IdTecnicoAsignado = u.IdUsuario AND (NULLIF(@TipoServicio, '') IS NULL OR a.TipoServicio = @TipoServicio)
    WHERE u.Activo = 1 AND r.Nombre = N'Técnico'
    GROUP BY u.IdUsuario, u.Nombre
    ORDER BY Abiertas DESC, u.Nombre;

    -- 4) Solicitudes de clientes sin técnico, las que más esperan primero
    SELECT IdTicket, NumeroBoleta, Empresa, TipoServicio, Recibida, DATEDIFF(DAY, Recibida, @Hoy) AS Dias
    FROM #Abiertas
    WHERE IdTecnicoAsignado IS NULL
    ORDER BY Recibida, NumeroBoleta;

    -- 5) Cerradas por mes y las del mismo mes del año anterior
    ;WITH Meses AS (
        SELECT DATEFROMPARTS(YEAR(@D), MONTH(@D), 1) AS Mes, 1 AS n
        UNION ALL
        SELECT DATEADD(MONTH, 1, Mes), n + 1 FROM Meses WHERE DATEADD(MONTH, 1, Mes) <= @H AND n < 36
    )
    SELECT m.Mes,
           (SELECT COUNT(*) FROM #T t WHERE t.Estado = 'Cerrada' AND t.Cerrada >= m.Mes AND t.Cerrada < DATEADD(MONTH, 1, m.Mes)
               AND t.Cerrada BETWEEN @D AND @H AND (@IdTecnico IS NULL OR t.IdTecnicoAsignado = @IdTecnico)) AS Cerradas,
           (SELECT COUNT(*) FROM #T t WHERE t.Estado = 'Cerrada' AND t.Cerrada >= DATEADD(YEAR, -1, m.Mes)
               AND t.Cerrada < DATEADD(MONTH, 1, DATEADD(YEAR, -1, m.Mes)) AND (@IdTecnico IS NULL OR t.IdTecnicoAsignado = @IdTecnico)) AS AnioAnterior
    FROM Meses m
    ORDER BY m.Mes;

    -- 6) Boletas cerradas del periodo con su resolución (la pantalla calcula la distribución y muestra el detalle)
    SELECT t.IdTicket, t.NumeroBoleta, t.Empresa, t.Tecnico, r.Resolucion, t.Cerrada
    FROM #T t
    CROSS APPLY (SELECT TOP 1 x.Resolucion FROM Reparacion x WHERE x.IdTicket = t.IdTicket AND x.Resolucion IS NOT NULL ORDER BY x.IdReparacion DESC) r
    WHERE t.Estado = 'Cerrada' AND t.Cerrada BETWEEN @D AND @H AND (@IdTecnico IS NULL OR t.IdTecnicoAsignado = @IdTecnico)
    ORDER BY t.Cerrada DESC;

    -- 7) Carga por técnico: boletas asignadas o cerradas en el periodo (sin fechas, el mes en curso)
    SELECT u.IdUsuario AS IdTecnico, u.Nombre AS Tecnico,
           COUNT(CASE WHEN t.Estado = 'Cerrada' THEN 1 END) AS Cerradas,
           COUNT(CASE WHEN t.IdTicket IS NOT NULL AND t.Estado <> 'Cerrada' THEN 1 END) AS EnCurso
    FROM Usuario u
    INNER JOIN Rol r ON r.IdRol = u.IdRol
    LEFT JOIN #T t ON t.IdTecnicoAsignado = u.IdUsuario AND t.Estado <> 'Cancelada'
         AND (t.Cerrada BETWEEN @DCarga AND @H OR (t.Estado <> 'Cerrada' AND ISNULL(t.Asignada, t.Recibida) BETWEEN @DCarga AND @H))
    WHERE u.Activo = 1 AND r.Nombre = N'Técnico'
    GROUP BY u.IdUsuario, u.Nombre
    ORDER BY u.Nombre;
END
