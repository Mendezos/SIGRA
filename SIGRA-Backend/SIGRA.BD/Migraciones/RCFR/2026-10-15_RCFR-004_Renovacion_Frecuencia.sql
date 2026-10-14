/*
  SIGRA - Migración 2026-10-15: RCFR-004 Renovación de frecuencias e historial de ciclos.
  Requiere haber ejecutado antes los scripts RCFR-001, RCFR-002 y RCFR-003.
  Ejecutar sobre la base de datos SIGRA (es idempotente: se puede correr varias veces).
  Si usa sqlcmd use: sqlcmd -S servidor -d SIGRA -E -I -f 65001 -i archivo.sql  (-f 65001 = UTF-8, necesario para las tildes; -I = QUOTED_IDENTIFIER ON).
  En SSMS basta con abrir el archivo y ejecutarlo (el archivo ya trae BOM UTF-8).

  No cambia la estructura de las tablas (el vínculo IdSolicitudOrigen ya existe desde RCFR-003). Cambios:
  1. Al iniciar la renovación de una frecuencia "Vigente" o "Por renovar", la frecuencia original pasa a "En renovación".
     Las frecuencias que ya tenían una renovación iniciada se actualizan a ese estado.
  2. No se puede renovar una frecuencia "Cancelada" (mensaje: "No es posible renovar una frecuencia cancelada").
  3. Una frecuencia "En renovación" que llega a su vencimiento sin que la renovación se otorgue pasa a "Vencida".
     Mientras está "En renovación" no genera alertas de vencimiento (la renovación ya está iniciada).
  4. Al otorgarse la renovación, la nueva frecuencia queda "Vigente" con su propio vencimiento (otorgamiento + 5 años) y su
     propio ciclo de alertas (6 meses, 3 meses y 30 días); la original queda "Renovada" y conserva todo su historial.
  5. sp_Solicitud_Historial (nuevo): devuelve todos los ciclos de una frecuencia en orden cronológico.
  6. sp_Frecuencia_ResumenDashboard: agrega el conteo de frecuencias "En renovación".

  Estados de una frecuencia: En solicitud -> Otorgada -> Vigente -> Por renovar -> En renovación -> Renovada (o Vencida / Cancelada).
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Las frecuencias que ya tenían una renovación iniciada pasan a "En renovación".
UPDATE o
SET o.Estado = 'En renovación'
FROM dbo.SolicitudFrecuencia o
WHERE o.Estado IN ('Vigente', 'Por renovar')
  AND EXISTS (SELECT 1 FROM dbo.SolicitudFrecuencia r WHERE r.IdSolicitudOrigen = o.IdSolicitud);
GO

CREATE OR ALTER PROCEDURE sp_Solicitud_Insertar
    @IdCliente         INT,
    @IdEquipo          INT,
    @IdVendedor        INT,
    @Frecuencia        VARCHAR(30),
    @Banda             VARCHAR(30),
    @Potencia          VARCHAR(30),
    @ZonaCobertura     VARCHAR(200),
    @FechaPresentacion DATE,
    @IdSolicitudOrigen INT = NULL   -- frecuencia que se está renovando
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IdSolicitud INT, @EstadoOrigen VARCHAR(30);

    BEGIN TRANSACTION;

    -- Evita registrar dos veces el mismo trámite (misma repetidora y frecuencia) mientras sigue en solicitud.
    IF EXISTS (SELECT 1 FROM SolicitudFrecuencia WITH (UPDLOCK, HOLDLOCK)
               WHERE IdEquipo = @IdEquipo AND Frecuencia = @Frecuencia AND Estado = 'En solicitud')
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'Ya existe una solicitud en trámite para esa repetidora con la misma frecuencia.', 1;
    END

    IF @IdSolicitudOrigen IS NOT NULL
    BEGIN
        SELECT @EstadoOrigen = Estado FROM SolicitudFrecuencia WITH (UPDLOCK, HOLDLOCK) WHERE IdSolicitud = @IdSolicitudOrigen;

        IF @EstadoOrigen = 'Cancelada'
        BEGIN
            ROLLBACK TRANSACTION;
            THROW 50001, N'No es posible renovar una frecuencia cancelada', 1;
        END

        -- Una frecuencia solo puede tener una renovación iniciada.
        IF EXISTS (SELECT 1 FROM SolicitudFrecuencia WITH (UPDLOCK, HOLDLOCK) WHERE IdSolicitudOrigen = @IdSolicitudOrigen)
        BEGIN
            ROLLBACK TRANSACTION;
            THROW 50001, N'La frecuencia ya tiene una renovación iniciada.', 1;
        END
    END

    -- El ID es correlativo (IDENTITY) y el estado inicial lo asigna el valor por defecto: "En solicitud".
    INSERT INTO SolicitudFrecuencia (IdCliente, IdEquipo, IdUsuario, Frecuencia, Banda, Potencia, ZonaCobertura, FechaPresentacion, IdSolicitudOrigen)
    VALUES (@IdCliente, @IdEquipo, @IdVendedor, @Frecuencia, @Banda, @Potencia, @ZonaCobertura, @FechaPresentacion, @IdSolicitudOrigen);
    SET @IdSolicitud = SCOPE_IDENTITY();

    -- La frecuencia original queda "En renovación" (una frecuencia ya vencida conserva su estado "Vencida").
    IF @IdSolicitudOrigen IS NOT NULL
        UPDATE SolicitudFrecuencia SET Estado = 'En renovación'
        WHERE IdSolicitud = @IdSolicitudOrigen AND Estado IN ('Vigente', 'Por renovar');

    COMMIT TRANSACTION;

    SELECT @IdSolicitud;
END

GO

CREATE OR ALTER PROCEDURE sp_Solicitud_Otorgar
    @IdSolicitud       INT,
    @FechaOtorgamiento DATE,
    @NumeroResolucion  VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    -- 1) La solicitud pasa a "Otorgada". Solo se puede otorgar una solicitud que sigue "En solicitud".
    UPDATE SolicitudFrecuencia
    SET Estado = 'Otorgada', FechaOtorgamiento = @FechaOtorgamiento, NumeroResolucion = @NumeroResolucion
    WHERE IdSolicitud = @IdSolicitud AND Estado = 'En solicitud';

    IF @@ROWCOUNT = 0
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'Solo se puede registrar el otorgamiento de una solicitud en estado "En solicitud".', 1;
    END

    -- 2) Se activa el ciclo de vigencia: vencimiento = otorgamiento + 5 años y estado "Vigente".
    --    Como es una solicitud nueva, el ciclo de alertas (6 meses, 3 meses y 30 días) empieza de cero.
    UPDATE SolicitudFrecuencia
    SET FechaVencimiento = DATEADD(YEAR, 5, @FechaOtorgamiento), Estado = 'Vigente'
    WHERE IdSolicitud = @IdSolicitud;

    -- 3) Si era una renovación, la frecuencia original queda "Renovada" y conserva su historial.
    UPDATE o
    SET o.Estado = 'Renovada'
    FROM SolicitudFrecuencia o
    INNER JOIN SolicitudFrecuencia r ON r.IdSolicitudOrigen = o.IdSolicitud
    WHERE r.IdSolicitud = @IdSolicitud AND o.Estado IN ('Vigente', 'Por renovar', 'En renovación', 'Vencida');

    COMMIT TRANSACTION;
END

GO

CREATE OR ALTER PROCEDURE sp_Frecuencia_EvaluarAlertas
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
    --    (incluye las "En renovación" cuya renovación todavía no fue otorgada).
    UPDATE SolicitudFrecuencia
    SET Estado = 'Vencida'
    OUTPUT inserted.IdSolicitud INTO @Vencidas
    WHERE Estado IN ('Vigente', 'Por renovar', 'En renovación') AND FechaVencimiento IS NOT NULL AND FechaVencimiento <= @Hoy;

    -- 2) Alertas: se genera, como máximo, la más urgente que corresponde a cada frecuencia y que aún no existe.
    --    Final (30 días) y Segunda (3 meses) solo aplican si no hay una renovación iniciada; Primera (6 meses) siempre.
    --    Una frecuencia "En renovación" ya tiene la renovación iniciada, por lo que no genera alertas.
    WITH Candidatas AS (
        SELECT s.IdSolicitud, s.IdUsuario, s.FechaVencimiento,
               CASE WHEN EXISTS (SELECT 1 FROM SolicitudFrecuencia r WHERE r.IdSolicitudOrigen = s.IdSolicitud) THEN 1 ELSE 0 END AS TieneRenovacion
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

GO

CREATE OR ALTER PROCEDURE sp_Frecuencia_ResumenDashboard
AS
BEGIN
    SET NOCOUNT ON;

    SELECT (SELECT COUNT(*) FROM SolicitudFrecuencia WHERE Estado = 'Vigente') AS Vigentes,
           (SELECT COUNT(*) FROM SolicitudFrecuencia WHERE Estado = 'Por renovar') AS PorRenovar,
           (SELECT COUNT(*) FROM SolicitudFrecuencia WHERE Estado = 'En renovación') AS EnRenovacion,
           (SELECT COUNT(*) FROM SolicitudFrecuencia WHERE Estado = 'Vencida') AS VencidasSinRenovacion,
           (SELECT COUNT(*) FROM AlertaFrecuencia WHERE Atendida = 0) AS AlertasPendientes,
           (SELECT COUNT(*) FROM AlertaFrecuencia a INNER JOIN SolicitudFrecuencia s ON s.IdSolicitud = a.IdSolicitud
            WHERE a.Tipo = 'Final' AND s.Estado = 'Por renovar') AS Urgentes;

    -- Frecuencias en alerta final (urgentes) que siguen sin renovarse: se resaltan en el dashboard.
    SELECT a.IdAlerta, a.IdSolicitud, c.Empresa, e.NumeroSerie, s.Frecuencia, a.FechaVencimiento,
           DATEDIFF(DAY, CAST(GETDATE() AS DATE), a.FechaVencimiento) AS DiasRestantes,
           v.Nombre AS Vendedor, a.Atendida
    FROM AlertaFrecuencia a
    INNER JOIN SolicitudFrecuencia s ON s.IdSolicitud = a.IdSolicitud
    INNER JOIN Cliente c ON c.IdCliente = s.IdCliente
    INNER JOIN Equipo e ON e.IdEquipo = s.IdEquipo
    INNER JOIN Usuario v ON v.IdUsuario = a.IdVendedor
    WHERE a.Tipo = 'Final' AND s.Estado = 'Por renovar'
    ORDER BY a.FechaVencimiento;
END

GO

CREATE OR ALTER PROCEDURE sp_Solicitud_Historial
    @IdSolicitud INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Sube hasta la solicitud original de la frecuencia (la que no es renovación de otra).
    DECLARE @Raiz INT = @IdSolicitud, @Padre INT, @Vueltas INT = 0;
    WHILE @Vueltas < 100
    BEGIN
        SET @Padre = NULL;
        SELECT @Padre = IdSolicitudOrigen FROM SolicitudFrecuencia WHERE IdSolicitud = @Raiz;
        IF @Padre IS NULL BREAK;
        SET @Raiz = @Padre;
        SET @Vueltas += 1;
    END

    -- Baja por la cadena de renovaciones: un ciclo por solicitud, en orden cronológico.
    ;WITH Cadena AS (
        SELECT IdSolicitud, 1 AS Ciclo FROM SolicitudFrecuencia WHERE IdSolicitud = @Raiz
        UNION ALL
        SELECT s.IdSolicitud, c.Ciclo + 1
        FROM SolicitudFrecuencia s
        INNER JOIN Cadena c ON s.IdSolicitudOrigen = c.IdSolicitud
    )
    SELECT c.Ciclo, s.IdSolicitud, s.Estado, s.Frecuencia, s.FechaPresentacion, s.FechaOtorgamiento,
           s.NumeroResolucion, s.FechaVencimiento, s.IdSolicitudOrigen,
           CAST(CASE WHEN s.IdSolicitud = @IdSolicitud THEN 1 ELSE 0 END AS BIT) AS EsActual
    FROM Cadena c
    INNER JOIN SolicitudFrecuencia s ON s.IdSolicitud = c.IdSolicitud
    ORDER BY c.Ciclo
    OPTION (MAXRECURSION 100);
END

GO
