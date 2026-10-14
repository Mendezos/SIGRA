/*
  SIGRA - Migración 2026-10-16: RCFR-005 Cancelación de solicitudes de frecuencia.
  Requiere haber ejecutado antes los scripts RCFR-001 a RCFR-004.
  Ejecutar sobre la base de datos SIGRA (es idempotente: se puede correr varias veces).
  Si usa sqlcmd use: sqlcmd -S servidor -d SIGRA -E -I -f 65001 -i archivo.sql  (-f 65001 = UTF-8, necesario para las tildes; -I = QUOTED_IDENTIFIER ON).
  En SSMS basta con abrir el archivo y ejecutarlo (el archivo ya trae BOM UTF-8).

  Cambios:
  1. SolicitudFrecuencia: se agregan FechaCancelacion, MotivoCancelacion e IdUsuarioCancelacion. Una solicitud en estado
     "Cancelada" siempre debe tener fecha y motivo (CK_SolicitudFrecuencia_Cancelacion). Las que ya estaban canceladas
     sin motivo se completan con una nota indicando que se cancelaron antes de este cambio.
  2. sp_Solicitud_Cancelar (nuevo): cancela la solicitud, registra motivo y fecha, y detiene sus alertas pendientes
     (las cierra automáticamente con una nota). Si se cancela una renovación en trámite, la frecuencia original sale de
     "En renovación" y vuelve a su ciclo normal (Vigente, Por renovar o Vencida) para retomar las alertas.
  3. Una renovación cancelada deja de contar como "renovación iniciada" (sp_Solicitud_Insertar, sp_Solicitud_Listar,
     sp_Frecuencia_EvaluarAlertas), por lo que se puede iniciar otra renovación.
  4. sp_Alerta_PorEnviar: no envía correos de alertas ya cerradas ni de solicitudes canceladas.
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ---------- 1. Datos de la cancelación ----------
IF COL_LENGTH('dbo.SolicitudFrecuencia', 'FechaCancelacion') IS NULL
    ALTER TABLE dbo.SolicitudFrecuencia ADD FechaCancelacion DATETIME NULL;
IF COL_LENGTH('dbo.SolicitudFrecuencia', 'MotivoCancelacion') IS NULL
    ALTER TABLE dbo.SolicitudFrecuencia ADD MotivoCancelacion VARCHAR(500) NULL;
IF COL_LENGTH('dbo.SolicitudFrecuencia', 'IdUsuarioCancelacion') IS NULL
    ALTER TABLE dbo.SolicitudFrecuencia ADD IdUsuarioCancelacion INT NULL
        CONSTRAINT FK_SolicitudFrecuencia_UsuarioCancelacion FOREIGN KEY REFERENCES dbo.Usuario (IdUsuario);
GO

-- Solicitudes que ya estaban canceladas (por ejemplo, de pruebas) y no tienen motivo.
UPDATE dbo.SolicitudFrecuencia
SET FechaCancelacion = ISNULL(FechaCancelacion, GETDATE()),
    MotivoCancelacion = ISNULL(MotivoCancelacion, 'Cancelada antes de registrar motivos (sin motivo indicado).')
WHERE Estado = 'Cancelada' AND (FechaCancelacion IS NULL OR MotivoCancelacion IS NULL);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_SolicitudFrecuencia_Cancelacion' AND parent_object_id = OBJECT_ID('dbo.SolicitudFrecuencia'))
    ALTER TABLE dbo.SolicitudFrecuencia ADD CONSTRAINT CK_SolicitudFrecuencia_Cancelacion
        CHECK (Estado <> 'Cancelada' OR (FechaCancelacion IS NOT NULL AND MotivoCancelacion IS NOT NULL));
GO

-- ---------- 2. Procedimientos almacenados ----------
CREATE OR ALTER PROCEDURE sp_Solicitud_Cancelar
    @IdSolicitud INT,
    @Motivo      VARCHAR(500),
    @IdUsuario   INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Estado VARCHAR(30), @Origen INT, @Hoy DATE = CAST(GETDATE() AS DATE);

    BEGIN TRANSACTION;

    SELECT @Estado = Estado, @Origen = IdSolicitudOrigen
    FROM SolicitudFrecuencia WITH (UPDLOCK, HOLDLOCK)
    WHERE IdSolicitud = @IdSolicitud;

    IF @Estado IS NULL
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'La solicitud indicada no existe.', 1;
    END

    IF @Estado = 'Cancelada'
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'La solicitud ya está cancelada.', 1;
    END

    IF @Estado = 'Renovada'
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'No se puede cancelar una frecuencia que ya fue renovada.', 1;
    END

    IF EXISTS (SELECT 1 FROM SolicitudFrecuencia WHERE IdSolicitudOrigen = @IdSolicitud AND Estado <> 'Cancelada')
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'No se puede cancelar una frecuencia que tiene una renovación en trámite. Cancele primero la renovación.', 1;
    END

    -- 1) La solicitud pasa a "Cancelada" con su motivo y fecha.
    UPDATE SolicitudFrecuencia
    SET Estado = 'Cancelada', FechaCancelacion = GETDATE(), MotivoCancelacion = @Motivo, IdUsuarioCancelacion = @IdUsuario
    WHERE IdSolicitud = @IdSolicitud;

    -- 2) Se detienen las alertas de vencimiento: las pendientes se cierran y ya no se envían por correo.
    UPDATE AlertaFrecuencia
    SET Atendida = 1, FechaAtencion = GETDATE(), IdUsuarioAtencion = @IdUsuario,
        NotaAtencion = LEFT(N'Alerta cerrada automáticamente: la solicitud fue cancelada. Motivo: ' + @Motivo, 1000)
    WHERE IdSolicitud = @IdSolicitud AND Atendida = 0;

    -- 3) Si era una renovación en trámite, la frecuencia original retoma su ciclo normal (y sus alertas).
    IF @Origen IS NOT NULL
        UPDATE o
        SET o.Estado = CASE WHEN o.FechaVencimiento <= @Hoy THEN 'Vencida'
                            WHEN DATEADD(MONTH, -6, o.FechaVencimiento) <= @Hoy THEN 'Por renovar'
                            ELSE 'Vigente' END
        FROM SolicitudFrecuencia o
        WHERE o.IdSolicitud = @Origen AND o.Estado = 'En renovación';

    COMMIT TRANSACTION;
END

GO

CREATE OR ALTER PROCEDURE sp_Solicitud_Listar
    @IdSolicitud INT = NULL,
    @Texto       VARCHAR(100) = NULL,
    @Estado      VARCHAR(30) = NULL,
    @IdVendedor  INT = NULL   -- un vendedor solo ve las solicitudes que tiene asignadas
AS
BEGIN
    SET NOCOUNT ON;

    SELECT s.IdSolicitud, s.IdCliente, c.Empresa, s.IdEquipo, e.NumeroSerie, m.Marca, m.Modelo,
           s.Frecuencia, s.Banda, s.Potencia, s.ZonaCobertura, s.FechaPresentacion, s.Estado,
           s.FechaSolicitud AS FechaRegistro, s.FechaOtorgamiento, s.NumeroResolucion, s.FechaVencimiento,
           CASE WHEN s.FechaVencimiento IS NULL THEN NULL
                ELSE DATEDIFF(DAY, CAST(GETDATE() AS DATE), s.FechaVencimiento) END AS DiasParaVencer,
           s.IdSolicitudOrigen, ren.IdSolicitud AS IdSolicitudRenovacion, ren.Estado AS EstadoRenovacion,
           s.FechaCancelacion, s.MotivoCancelacion, uc.Nombre AS UsuarioCancelacion,
           s.IdUsuario AS IdVendedor, v.Nombre AS Vendedor,
           (SELECT COUNT(*) FROM DocumentoFrecuencia d WHERE d.IdSolicitud = s.IdSolicitud AND d.Contenido IS NOT NULL) AS CantidadDocumentos
    FROM SolicitudFrecuencia s
    INNER JOIN Cliente c ON c.IdCliente = s.IdCliente
    INNER JOIN Equipo e ON e.IdEquipo = s.IdEquipo
    INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    INNER JOIN Usuario v ON v.IdUsuario = s.IdUsuario
    LEFT JOIN Usuario uc ON uc.IdUsuario = s.IdUsuarioCancelacion
    -- Una renovación cancelada ya no cuenta como renovación iniciada.
    OUTER APPLY (SELECT TOP 1 r.IdSolicitud, r.Estado FROM SolicitudFrecuencia r
                 WHERE r.IdSolicitudOrigen = s.IdSolicitud AND r.Estado <> 'Cancelada' ORDER BY r.IdSolicitud DESC) ren
    WHERE (@IdSolicitud IS NULL OR s.IdSolicitud = @IdSolicitud)
      AND (@Estado IS NULL OR s.Estado = @Estado)
      AND (@IdVendedor IS NULL OR s.IdUsuario = @IdVendedor)
      AND (@Texto IS NULL OR c.Empresa LIKE '%' + @Texto + '%' OR e.NumeroSerie LIKE '%' + @Texto + '%'
           OR s.Frecuencia LIKE '%' + @Texto + '%' OR s.ZonaCobertura LIKE '%' + @Texto + '%'
           OR s.NumeroResolucion LIKE '%' + @Texto + '%' OR v.Nombre LIKE '%' + @Texto + '%'
           OR 'SF-' + RIGHT('0000' + CAST(s.IdSolicitud AS VARCHAR(10)), 4) LIKE '%' + @Texto + '%')
    ORDER BY s.IdSolicitud DESC;
END

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

        -- Una frecuencia solo puede tener una renovación en trámite (las canceladas no cuentan).
        IF EXISTS (SELECT 1 FROM SolicitudFrecuencia WITH (UPDLOCK, HOLDLOCK)
                   WHERE IdSolicitudOrigen = @IdSolicitudOrigen AND Estado <> 'Cancelada')
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

GO

CREATE OR ALTER PROCEDURE sp_Alerta_PorEnviar
    @MaxIntentos INT = 5
AS
BEGIN
    SET NOCOUNT ON;

    -- No se envían alertas ya cerradas (atendidas o detenidas por una cancelación) ni de solicitudes canceladas.
    SELECT a.IdAlerta, a.IdSolicitud, a.Tipo, a.FechaVencimiento,
           DATEDIFF(DAY, CAST(GETDATE() AS DATE), a.FechaVencimiento) AS DiasRestantes,
           c.Empresa, e.NumeroSerie, s.Frecuencia, s.Banda,
           v.Nombre AS Vendedor, v.Correo AS CorreoVendedor
    FROM AlertaFrecuencia a
    INNER JOIN SolicitudFrecuencia s ON s.IdSolicitud = a.IdSolicitud
    INNER JOIN Cliente c ON c.IdCliente = s.IdCliente
    INNER JOIN Equipo e ON e.IdEquipo = s.IdEquipo
    INNER JOIN Usuario v ON v.IdUsuario = a.IdVendedor
    WHERE a.CorreoEnviado = 0 AND a.IntentosEnvio < @MaxIntentos
      AND a.Atendida = 0 AND s.Estado <> 'Cancelada'
    ORDER BY a.IdAlerta;
END

GO
