/*
  SIGRA - Migración 2026-10-14: RCFR-003 Alertas de vencimiento de frecuencias.
  Requiere haber ejecutado antes los scripts RCFR-001 y RCFR-002.
  Ejecutar sobre la base de datos SIGRA (es idempotente: se puede correr varias veces).
  Si usa sqlcmd use: sqlcmd -S servidor -d SIGRA -E -I -f 65001 -i archivo.sql  (-f 65001 = UTF-8, necesario para las tildes; -I = QUOTED_IDENTIFIER ON).
  En SSMS basta con abrir el archivo y ejecutarlo (el archivo ya trae BOM UTF-8).

  Cambios:
  1. SolicitudFrecuencia.IdSolicitudOrigen (nuevo): vincula una solicitud de renovación con la frecuencia que renueva.
  2. AlertaFrecuencia (tabla nueva): una alerta por frecuencia y tipo (Primera = 6 meses, Segunda = 3 meses,
     Final = 30 días, urgente), con el estado del envío del correo y el registro de atención (fecha y nota).
  3. sp_Frecuencia_EvaluarAlertas (nuevo): lo ejecuta el proceso automático de la API. Marca como "Vencida" las
     frecuencias cuyo vencimiento llegó, genera las alertas que corresponden y pasa a "Por renovar" las frecuencias alertadas.
  4. sp_Alerta_Listar, sp_Alerta_PorEnviar, sp_Alerta_MarcarEnvio, sp_Alerta_Atender y sp_Frecuencia_ResumenDashboard (nuevos).
  5. sp_Solicitud_Insertar, sp_Solicitud_Listar y sp_Solicitud_Otorgar (actualizados): soportan la renovación;
     al otorgarse una renovación, la frecuencia original pasa a "Renovada".

  Estados de una frecuencia: En solicitud -> Otorgada -> Vigente -> Por renovar -> Vencida (o Renovada si se renueva).
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ---------- 1. Vínculo de renovación ----------
IF COL_LENGTH('dbo.SolicitudFrecuencia', 'IdSolicitudOrigen') IS NULL
    ALTER TABLE dbo.SolicitudFrecuencia ADD IdSolicitudOrigen INT NULL
        CONSTRAINT FK_SolicitudFrecuencia_Origen FOREIGN KEY REFERENCES dbo.SolicitudFrecuencia (IdSolicitud);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SolicitudFrecuencia_IdSolicitudOrigen' AND object_id = OBJECT_ID('dbo.SolicitudFrecuencia'))
    CREATE NONCLUSTERED INDEX IX_SolicitudFrecuencia_IdSolicitudOrigen ON dbo.SolicitudFrecuencia (IdSolicitudOrigen ASC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SolicitudFrecuencia_Estado' AND object_id = OBJECT_ID('dbo.SolicitudFrecuencia'))
    CREATE NONCLUSTERED INDEX IX_SolicitudFrecuencia_Estado ON dbo.SolicitudFrecuencia (Estado ASC);
GO

-- ---------- 2. Alertas ----------
IF OBJECT_ID('dbo.AlertaFrecuencia', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AlertaFrecuencia (
        IdAlerta          INT           IDENTITY (1, 1) NOT NULL,
        IdSolicitud       INT           NOT NULL,
        Tipo              VARCHAR (10)  NOT NULL,
        FechaAlerta       DATE          NOT NULL,
        FechaVencimiento  DATE          NOT NULL,
        IdVendedor        INT           NOT NULL,
        CorreoEnviado     BIT           CONSTRAINT DF_AlertaFrecuencia_CorreoEnviado DEFAULT (0) NOT NULL,
        FechaEnvio        DATETIME      NULL,
        IntentosEnvio     INT           CONSTRAINT DF_AlertaFrecuencia_Intentos DEFAULT (0) NOT NULL,
        ErrorEnvio        VARCHAR (500) NULL,
        Atendida          BIT           CONSTRAINT DF_AlertaFrecuencia_Atendida DEFAULT (0) NOT NULL,
        FechaAtencion     DATETIME      NULL,
        NotaAtencion      VARCHAR (1000) NULL,
        IdUsuarioAtencion INT           NULL,
        CONSTRAINT PK_AlertaFrecuencia PRIMARY KEY CLUSTERED (IdAlerta ASC),
        CONSTRAINT FK_AlertaFrecuencia_Solicitud FOREIGN KEY (IdSolicitud) REFERENCES dbo.SolicitudFrecuencia (IdSolicitud),
        CONSTRAINT FK_AlertaFrecuencia_Vendedor FOREIGN KEY (IdVendedor) REFERENCES dbo.Usuario (IdUsuario),
        CONSTRAINT FK_AlertaFrecuencia_UsuarioAtencion FOREIGN KEY (IdUsuarioAtencion) REFERENCES dbo.Usuario (IdUsuario),
        CONSTRAINT CK_AlertaFrecuencia_Tipo CHECK (Tipo IN ('Primera', 'Segunda', 'Final')),
        CONSTRAINT CK_AlertaFrecuencia_Atencion CHECK (Atendida = 0 OR (FechaAtencion IS NOT NULL AND NotaAtencion IS NOT NULL)),
        CONSTRAINT UQ_AlertaFrecuencia_SolicitudTipo UNIQUE (IdSolicitud, Tipo)
    );

    CREATE NONCLUSTERED INDEX IX_AlertaFrecuencia_Vendedor ON dbo.AlertaFrecuencia (IdVendedor ASC, Atendida ASC);
END
GO

-- ---------- 3. Procedimientos almacenados ----------
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

    -- 1) Frecuencias que llegaron a su fecha de vencimiento pasan a "Vencida".
    UPDATE SolicitudFrecuencia
    SET Estado = 'Vencida'
    OUTPUT inserted.IdSolicitud INTO @Vencidas
    WHERE Estado IN ('Vigente', 'Por renovar') AND FechaVencimiento IS NOT NULL AND FechaVencimiento <= @Hoy;

    -- 2) Alertas: se genera, como máximo, la más urgente que corresponde a cada frecuencia y que aún no existe.
    --    Final (30 días) y Segunda (3 meses) solo aplican si no hay una renovación iniciada; Primera (6 meses) siempre.
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

CREATE OR ALTER PROCEDURE sp_Alerta_Listar
    @IdAlerta   INT = NULL,
    @IdVendedor INT = NULL,   -- un vendedor solo ve sus alertas
    @Atendida   BIT = NULL    -- 0 = pendientes, 1 = atendidas, NULL = todas
AS
BEGIN
    SET NOCOUNT ON;

    SELECT a.IdAlerta, a.IdSolicitud, a.Tipo, CAST(CASE WHEN a.Tipo = 'Final' THEN 1 ELSE 0 END AS BIT) AS Urgente,
           a.FechaAlerta, a.FechaVencimiento,
           DATEDIFF(DAY, CAST(GETDATE() AS DATE), a.FechaVencimiento) AS DiasRestantes,
           a.CorreoEnviado, a.FechaEnvio, a.ErrorEnvio,
           a.Atendida, a.FechaAtencion, a.NotaAtencion, ua.Nombre AS UsuarioAtencion,
           c.Empresa, e.NumeroSerie, s.Frecuencia, s.Banda, s.Estado AS EstadoSolicitud,
           a.IdVendedor, v.Nombre AS Vendedor
    FROM AlertaFrecuencia a
    INNER JOIN SolicitudFrecuencia s ON s.IdSolicitud = a.IdSolicitud
    INNER JOIN Cliente c ON c.IdCliente = s.IdCliente
    INNER JOIN Equipo e ON e.IdEquipo = s.IdEquipo
    INNER JOIN Usuario v ON v.IdUsuario = a.IdVendedor
    LEFT JOIN Usuario ua ON ua.IdUsuario = a.IdUsuarioAtencion
    WHERE (@IdAlerta IS NULL OR a.IdAlerta = @IdAlerta)
      AND (@IdVendedor IS NULL OR a.IdVendedor = @IdVendedor)
      AND (@Atendida IS NULL OR a.Atendida = @Atendida)
    ORDER BY a.Atendida, CASE WHEN a.Tipo = 'Final' THEN 0 ELSE 1 END, a.FechaVencimiento, a.IdAlerta;
END

GO

CREATE OR ALTER PROCEDURE sp_Alerta_PorEnviar
    @MaxIntentos INT = 5
AS
BEGIN
    SET NOCOUNT ON;

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
    ORDER BY a.IdAlerta;
END

GO

CREATE OR ALTER PROCEDURE sp_Alerta_MarcarEnvio
    @IdAlerta INT,
    @Enviado  BIT,
    @Error    VARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE AlertaFrecuencia
    SET CorreoEnviado = @Enviado,
        FechaEnvio = CASE WHEN @Enviado = 1 THEN GETDATE() ELSE FechaEnvio END,
        IntentosEnvio = IntentosEnvio + 1,
        ErrorEnvio = CASE WHEN @Enviado = 1 THEN NULL ELSE LEFT(@Error, 500) END
    WHERE IdAlerta = @IdAlerta;
END

GO

CREATE OR ALTER PROCEDURE sp_Alerta_Atender
    @IdAlerta  INT,
    @Nota      VARCHAR(1000),
    @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE AlertaFrecuencia
    SET Atendida = 1, FechaAtencion = GETDATE(), NotaAtencion = @Nota, IdUsuarioAtencion = @IdUsuario
    WHERE IdAlerta = @IdAlerta AND Atendida = 0;

    IF @@ROWCOUNT = 0
        THROW 50001, N'La alerta ya fue marcada como atendida.', 1;
END

GO

CREATE OR ALTER PROCEDURE sp_Frecuencia_ResumenDashboard
AS
BEGIN
    SET NOCOUNT ON;

    SELECT (SELECT COUNT(*) FROM SolicitudFrecuencia WHERE Estado = 'Vigente') AS Vigentes,
           (SELECT COUNT(*) FROM SolicitudFrecuencia WHERE Estado = 'Por renovar') AS PorRenovar,
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

    DECLARE @IdSolicitud INT;

    BEGIN TRANSACTION;

    -- Evita registrar dos veces el mismo trámite (misma repetidora y frecuencia) mientras sigue en solicitud.
    IF EXISTS (SELECT 1 FROM SolicitudFrecuencia WITH (UPDLOCK, HOLDLOCK)
               WHERE IdEquipo = @IdEquipo AND Frecuencia = @Frecuencia AND Estado = 'En solicitud')
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'Ya existe una solicitud en trámite para esa repetidora con la misma frecuencia.', 1;
    END

    -- Una frecuencia solo puede tener una renovación iniciada.
    IF @IdSolicitudOrigen IS NOT NULL
       AND EXISTS (SELECT 1 FROM SolicitudFrecuencia WITH (UPDLOCK, HOLDLOCK) WHERE IdSolicitudOrigen = @IdSolicitudOrigen)
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'La frecuencia ya tiene una renovación iniciada.', 1;
    END

    -- El ID es correlativo (IDENTITY) y el estado inicial lo asigna el valor por defecto: "En solicitud".
    INSERT INTO SolicitudFrecuencia (IdCliente, IdEquipo, IdUsuario, Frecuencia, Banda, Potencia, ZonaCobertura, FechaPresentacion, IdSolicitudOrigen)
    VALUES (@IdCliente, @IdEquipo, @IdVendedor, @Frecuencia, @Banda, @Potencia, @ZonaCobertura, @FechaPresentacion, @IdSolicitudOrigen);
    SET @IdSolicitud = SCOPE_IDENTITY();

    COMMIT TRANSACTION;

    SELECT @IdSolicitud;
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
           s.IdUsuario AS IdVendedor, v.Nombre AS Vendedor,
           (SELECT COUNT(*) FROM DocumentoFrecuencia d WHERE d.IdSolicitud = s.IdSolicitud AND d.Contenido IS NOT NULL) AS CantidadDocumentos
    FROM SolicitudFrecuencia s
    INNER JOIN Cliente c ON c.IdCliente = s.IdCliente
    INNER JOIN Equipo e ON e.IdEquipo = s.IdEquipo
    INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    INNER JOIN Usuario v ON v.IdUsuario = s.IdUsuario
    OUTER APPLY (SELECT TOP 1 r.IdSolicitud, r.Estado FROM SolicitudFrecuencia r
                 WHERE r.IdSolicitudOrigen = s.IdSolicitud ORDER BY r.IdSolicitud DESC) ren
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
    UPDATE SolicitudFrecuencia
    SET FechaVencimiento = DATEADD(YEAR, 5, @FechaOtorgamiento), Estado = 'Vigente'
    WHERE IdSolicitud = @IdSolicitud;

    -- 3) Si era una renovación, la frecuencia original queda "Renovada" y deja de generar alertas.
    UPDATE o
    SET o.Estado = 'Renovada'
    FROM SolicitudFrecuencia o
    INNER JOIN SolicitudFrecuencia r ON r.IdSolicitudOrigen = o.IdSolicitud
    WHERE r.IdSolicitud = @IdSolicitud AND o.Estado IN ('Vigente', 'Por renovar', 'Vencida');

    COMMIT TRANSACTION;
END

GO
