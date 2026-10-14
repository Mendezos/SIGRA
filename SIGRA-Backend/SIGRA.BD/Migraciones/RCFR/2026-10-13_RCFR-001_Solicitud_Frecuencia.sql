/*
  SIGRA - Migración 2026-10-13: RCFR-001 Registro de solicitudes de frecuencia radioeléctrica.
  Ejecutar sobre la base de datos SIGRA (es idempotente: se puede correr varias veces).
  Si usa sqlcmd use: sqlcmd -S servidor -d SIGRA -E -I -f 65001 -i archivo.sql  (-f 65001 = UTF-8, necesario para las tildes; -I = QUOTED_IDENTIFIER ON).
  En SSMS basta con abrir el archivo y ejecutarlo (el archivo ya trae BOM UTF-8).

  Los archivos (PDF, JPG, PNG, XLSX; máximo 10 MB) se guardan dentro de la base de datos, en
  DocumentoFrecuencia.Contenido (VARBINARY(MAX)), igual que los documentos técnicos de las repetidoras (CARR-012).

  Cambios:
  1. SolicitudFrecuencia (tabla que existía sin uso): se agregan Frecuencia, Banda, Potencia, ZonaCobertura y
     FechaPresentacion. El estado inicial pasa de "Pendiente" a "En solicitud".
     IdUsuario es el vendedor responsable (recibe las alertas de vencimiento) y FechaSolicitud es la fecha de registro.
  2. DocumentoFrecuencia (tabla que existía sin uso): RutaArchivo pasa a ser opcional y se agregan TipoDocumento
     (Formulario presentado / Acuse de recibo / Otro), NombreArchivo, TipoContenido, TamanoBytes, Contenido, FechaCarga e IdUsuario.
  3. SP nuevos: sp_Frecuencia_RepetidorasCliente, sp_Solicitud_Insertar, sp_Solicitud_Listar,
     sp_SolicitudDocumento_Insertar, sp_SolicitudDocumento_Listar y sp_SolicitudDocumento_Obtener.
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ---------- 1. SolicitudFrecuencia ----------
IF COL_LENGTH('dbo.SolicitudFrecuencia', 'Frecuencia') IS NULL
    ALTER TABLE dbo.SolicitudFrecuencia ADD Frecuencia VARCHAR(30) NULL;
IF COL_LENGTH('dbo.SolicitudFrecuencia', 'Banda') IS NULL
    ALTER TABLE dbo.SolicitudFrecuencia ADD Banda VARCHAR(30) NULL;
IF COL_LENGTH('dbo.SolicitudFrecuencia', 'Potencia') IS NULL
    ALTER TABLE dbo.SolicitudFrecuencia ADD Potencia VARCHAR(30) NULL;
IF COL_LENGTH('dbo.SolicitudFrecuencia', 'ZonaCobertura') IS NULL
    ALTER TABLE dbo.SolicitudFrecuencia ADD ZonaCobertura VARCHAR(200) NULL;
IF COL_LENGTH('dbo.SolicitudFrecuencia', 'FechaPresentacion') IS NULL
    ALTER TABLE dbo.SolicitudFrecuencia ADD FechaPresentacion DATE NULL;
GO

-- El estado inicial de una solicitud nueva es "En solicitud".
IF EXISTS (SELECT 1 FROM sys.default_constraints
           WHERE name = 'DF_SolicitudFrecuencia_Estado' AND parent_object_id = OBJECT_ID('dbo.SolicitudFrecuencia')
             AND definition <> '(''En solicitud'')')
    ALTER TABLE dbo.SolicitudFrecuencia DROP CONSTRAINT DF_SolicitudFrecuencia_Estado;
GO

IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_SolicitudFrecuencia_Estado' AND parent_object_id = OBJECT_ID('dbo.SolicitudFrecuencia'))
    ALTER TABLE dbo.SolicitudFrecuencia ADD CONSTRAINT DF_SolicitudFrecuencia_Estado DEFAULT ('En solicitud') FOR Estado;
GO

UPDATE dbo.SolicitudFrecuencia SET Estado = 'En solicitud' WHERE Estado = 'Pendiente';
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SolicitudFrecuencia_IdUsuario' AND object_id = OBJECT_ID('dbo.SolicitudFrecuencia'))
    CREATE NONCLUSTERED INDEX IX_SolicitudFrecuencia_IdUsuario ON dbo.SolicitudFrecuencia (IdUsuario ASC);
GO

-- ---------- 2. DocumentoFrecuencia ----------
ALTER TABLE dbo.DocumentoFrecuencia ALTER COLUMN RutaArchivo VARCHAR(300) NULL;
GO

IF COL_LENGTH('dbo.DocumentoFrecuencia', 'TipoDocumento') IS NULL
    ALTER TABLE dbo.DocumentoFrecuencia ADD TipoDocumento VARCHAR(30) NULL;
IF COL_LENGTH('dbo.DocumentoFrecuencia', 'NombreArchivo') IS NULL
    ALTER TABLE dbo.DocumentoFrecuencia ADD NombreArchivo VARCHAR(255) NULL;
IF COL_LENGTH('dbo.DocumentoFrecuencia', 'TipoContenido') IS NULL
    ALTER TABLE dbo.DocumentoFrecuencia ADD TipoContenido VARCHAR(100) NULL;
IF COL_LENGTH('dbo.DocumentoFrecuencia', 'TamanoBytes') IS NULL
    ALTER TABLE dbo.DocumentoFrecuencia ADD TamanoBytes INT NULL;
IF COL_LENGTH('dbo.DocumentoFrecuencia', 'Contenido') IS NULL
    ALTER TABLE dbo.DocumentoFrecuencia ADD Contenido VARBINARY(MAX) NULL;
IF COL_LENGTH('dbo.DocumentoFrecuencia', 'FechaCarga') IS NULL
    ALTER TABLE dbo.DocumentoFrecuencia ADD FechaCarga DATETIME NOT NULL
        CONSTRAINT DF_DocumentoFrecuencia_FechaCarga DEFAULT (GETDATE());
IF COL_LENGTH('dbo.DocumentoFrecuencia', 'IdUsuario') IS NULL
    ALTER TABLE dbo.DocumentoFrecuencia ADD IdUsuario INT NULL
        CONSTRAINT FK_DocumentoFrecuencia_Usuario FOREIGN KEY REFERENCES dbo.Usuario (IdUsuario);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_DocumentoFrecuencia_Tipo')
    ALTER TABLE dbo.DocumentoFrecuencia ADD CONSTRAINT CK_DocumentoFrecuencia_Tipo
        CHECK (TipoDocumento IS NULL OR TipoDocumento IN ('Formulario presentado', 'Acuse de recibo', 'Otro'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_DocumentoFrecuencia_IdSolicitud' AND object_id = OBJECT_ID('dbo.DocumentoFrecuencia'))
    CREATE NONCLUSTERED INDEX IX_DocumentoFrecuencia_IdSolicitud ON dbo.DocumentoFrecuencia (IdSolicitud ASC);
GO

-- ---------- 3. Procedimientos almacenados ----------
CREATE OR ALTER PROCEDURE sp_Frecuencia_RepetidorasCliente
    @IdCliente INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Repetidoras del módulo de alquiler cuyo contrato más reciente pertenece al cliente.
    SELECT e.IdEquipo, e.NumeroSerie, m.Marca, m.Modelo, ce.IdContrato, ct.Estado AS EstadoContrato
    FROM Equipo e
    INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    INNER JOIN CategoriaEquipo cat ON cat.IdCategoria = m.IdCategoria
    INNER JOIN ContratoEquipo ce ON ce.IdEquipo = e.IdEquipo
        AND ce.IdContratoEquipo = (SELECT MAX(x.IdContratoEquipo) FROM ContratoEquipo x WHERE x.IdEquipo = e.IdEquipo)
    INNER JOIN Contrato ct ON ct.IdContrato = ce.IdContrato
    WHERE cat.Nombre = N'Repetidora' AND ct.IdCliente = @IdCliente
    ORDER BY e.NumeroSerie;
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
    @FechaPresentacion DATE
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

    -- El ID es correlativo (IDENTITY) y el estado inicial lo asigna el valor por defecto: "En solicitud".
    INSERT INTO SolicitudFrecuencia (IdCliente, IdEquipo, IdUsuario, Frecuencia, Banda, Potencia, ZonaCobertura, FechaPresentacion)
    VALUES (@IdCliente, @IdEquipo, @IdVendedor, @Frecuencia, @Banda, @Potencia, @ZonaCobertura, @FechaPresentacion);
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
           s.FechaSolicitud AS FechaRegistro, s.FechaVencimiento,
           s.IdUsuario AS IdVendedor, v.Nombre AS Vendedor,
           (SELECT COUNT(*) FROM DocumentoFrecuencia d WHERE d.IdSolicitud = s.IdSolicitud AND d.Contenido IS NOT NULL) AS CantidadDocumentos
    FROM SolicitudFrecuencia s
    INNER JOIN Cliente c ON c.IdCliente = s.IdCliente
    INNER JOIN Equipo e ON e.IdEquipo = s.IdEquipo
    INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    INNER JOIN Usuario v ON v.IdUsuario = s.IdUsuario
    WHERE (@IdSolicitud IS NULL OR s.IdSolicitud = @IdSolicitud)
      AND (@Estado IS NULL OR s.Estado = @Estado)
      AND (@IdVendedor IS NULL OR s.IdUsuario = @IdVendedor)
      AND (@Texto IS NULL OR c.Empresa LIKE '%' + @Texto + '%' OR e.NumeroSerie LIKE '%' + @Texto + '%'
           OR s.Frecuencia LIKE '%' + @Texto + '%' OR s.ZonaCobertura LIKE '%' + @Texto + '%'
           OR v.Nombre LIKE '%' + @Texto + '%'
           OR 'SF-' + RIGHT('0000' + CAST(s.IdSolicitud AS VARCHAR(10)), 4) LIKE '%' + @Texto + '%')
    ORDER BY s.IdSolicitud DESC;
END

GO

CREATE OR ALTER PROCEDURE sp_SolicitudDocumento_Insertar
    @IdSolicitud     INT,
    @TipoDocumento   VARCHAR(30),
    @NombreDocumento VARCHAR(150),
    @NombreArchivo   VARCHAR(255),
    @TipoContenido   VARCHAR(100),
    @TamanoBytes     INT,
    @Contenido       VARBINARY(MAX),
    @IdUsuario       INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO DocumentoFrecuencia (IdSolicitud, NombreDocumento, TipoDocumento, NombreArchivo, TipoContenido, TamanoBytes, Contenido, IdUsuario)
    VALUES (@IdSolicitud, @NombreDocumento, @TipoDocumento, @NombreArchivo, @TipoContenido, @TamanoBytes, @Contenido, @IdUsuario);

    SELECT SCOPE_IDENTITY();
END

GO

CREATE OR ALTER PROCEDURE sp_SolicitudDocumento_Listar
    @IdSolicitud INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Solo metadatos: el contenido se descarga con sp_SolicitudDocumento_Obtener.
    SELECT d.IdDocumento, d.IdSolicitud, ISNULL(d.TipoDocumento, 'Otro') AS TipoDocumento, d.NombreDocumento,
           d.NombreArchivo, d.TipoContenido, d.TamanoBytes, d.FechaCarga, u.Nombre AS Usuario
    FROM DocumentoFrecuencia d
    LEFT JOIN Usuario u ON u.IdUsuario = d.IdUsuario
    WHERE d.IdSolicitud = @IdSolicitud AND d.Contenido IS NOT NULL
    ORDER BY d.FechaCarga DESC, d.IdDocumento DESC;
END

GO

CREATE OR ALTER PROCEDURE sp_SolicitudDocumento_Obtener
    @IdDocumento INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT d.IdDocumento, d.IdSolicitud, d.NombreDocumento, d.NombreArchivo, d.TipoContenido, d.Contenido
    FROM DocumentoFrecuencia d
    WHERE d.IdDocumento = @IdDocumento AND d.Contenido IS NOT NULL;
END

GO
