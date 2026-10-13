/*
  SIGRA - Migración 2026-10-12: CARR-012 Documentos técnicos adjuntos a la ficha de una repetidora.
  Ejecutar sobre la base de datos SIGRA (es idempotente: se puede correr varias veces).
  Si usa sqlcmd use: sqlcmd -S servidor -d SIGRA -E -I -f 65001 -i archivo.sql  (-f 65001 = UTF-8, necesario para las tildes; -I = QUOTED_IDENTIFIER ON).
  En SSMS basta con abrir el archivo y ejecutarlo (el archivo ya trae BOM UTF-8).

  Los archivos (PDF, JPG, PNG, XLSX; máximo 10 MB) se guardan dentro de la base de datos, en
  DocumentoTecnico.Contenido (VARBINARY(MAX)), para que todo el equipo comparta los mismos adjuntos
  sin depender de carpetas locales.

  Cambios:
  1. DocumentoTecnico (tabla que existía sin uso): RutaArchivo pasa a ser opcional y se agregan TipoDocumento
     (Plano / Acta de instalación / Otro), NombreArchivo, TipoContenido, TamanoBytes, Contenido, FechaCarga e IdUsuario.
  2. Índice por IdEquipo.
  3. SP nuevos: sp_Documento_Insertar, sp_Documento_Listar y sp_Documento_Obtener.
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

ALTER TABLE dbo.DocumentoTecnico ALTER COLUMN RutaArchivo VARCHAR(300) NULL;
GO

IF COL_LENGTH('dbo.DocumentoTecnico', 'TipoDocumento') IS NULL
    ALTER TABLE dbo.DocumentoTecnico ADD TipoDocumento VARCHAR(30) NULL;
IF COL_LENGTH('dbo.DocumentoTecnico', 'NombreArchivo') IS NULL
    ALTER TABLE dbo.DocumentoTecnico ADD NombreArchivo VARCHAR(255) NULL;
IF COL_LENGTH('dbo.DocumentoTecnico', 'TipoContenido') IS NULL
    ALTER TABLE dbo.DocumentoTecnico ADD TipoContenido VARCHAR(100) NULL;
IF COL_LENGTH('dbo.DocumentoTecnico', 'TamanoBytes') IS NULL
    ALTER TABLE dbo.DocumentoTecnico ADD TamanoBytes INT NULL;
IF COL_LENGTH('dbo.DocumentoTecnico', 'Contenido') IS NULL
    ALTER TABLE dbo.DocumentoTecnico ADD Contenido VARBINARY(MAX) NULL;
IF COL_LENGTH('dbo.DocumentoTecnico', 'FechaCarga') IS NULL
    ALTER TABLE dbo.DocumentoTecnico ADD FechaCarga DATETIME NOT NULL
        CONSTRAINT DF_DocumentoTecnico_FechaCarga DEFAULT (GETDATE());
IF COL_LENGTH('dbo.DocumentoTecnico', 'IdUsuario') IS NULL
    ALTER TABLE dbo.DocumentoTecnico ADD IdUsuario INT NULL
        CONSTRAINT FK_DocumentoTecnico_Usuario FOREIGN KEY REFERENCES dbo.Usuario (IdUsuario);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_DocumentoTecnico_Tipo')
    ALTER TABLE dbo.DocumentoTecnico ADD CONSTRAINT CK_DocumentoTecnico_Tipo
        CHECK (TipoDocumento IS NULL OR TipoDocumento IN ('Plano', 'Acta de instalación', 'Otro'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_DocumentoTecnico_IdEquipo' AND object_id = OBJECT_ID('dbo.DocumentoTecnico'))
    CREATE NONCLUSTERED INDEX IX_DocumentoTecnico_IdEquipo ON dbo.DocumentoTecnico (IdEquipo ASC);
GO

CREATE OR ALTER PROCEDURE sp_Documento_Insertar
    @IdEquipo        INT,
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
    SET XACT_ABORT ON;

    DECLARE @IdDocumento INT;

    BEGIN TRANSACTION;

    INSERT INTO DocumentoTecnico (IdEquipo, NombreDocumento, TipoDocumento, NombreArchivo, TipoContenido, TamanoBytes, Contenido, IdUsuario)
    VALUES (@IdEquipo, @NombreDocumento, @TipoDocumento, @NombreArchivo, @TipoContenido, @TamanoBytes, @Contenido, @IdUsuario);
    SET @IdDocumento = SCOPE_IDENTITY();

    INSERT INTO BitacoraEquipo (IdEquipo, Descripcion)
    VALUES (@IdEquipo, N'Documento técnico adjuntado (' + @TipoDocumento + N'): ' + @NombreDocumento + N'.');

    COMMIT TRANSACTION;

    SELECT @IdDocumento;
END

GO

CREATE OR ALTER PROCEDURE sp_Documento_Listar
    @IdEquipo INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Solo metadatos: el contenido se descarga con sp_Documento_Obtener.
    SELECT d.IdDocumento, d.IdEquipo, ISNULL(d.TipoDocumento, 'Otro') AS TipoDocumento, d.NombreDocumento,
           d.NombreArchivo, d.TipoContenido, d.TamanoBytes, d.FechaCarga, u.Nombre AS Usuario
    FROM DocumentoTecnico d
    LEFT JOIN Usuario u ON u.IdUsuario = d.IdUsuario
    WHERE d.IdEquipo = @IdEquipo AND d.Contenido IS NOT NULL
    ORDER BY d.FechaCarga DESC, d.IdDocumento DESC;
END

GO

CREATE OR ALTER PROCEDURE sp_Documento_Obtener
    @IdDocumento INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT d.IdDocumento, d.IdEquipo, d.NombreDocumento, d.NombreArchivo, d.TipoContenido, d.Contenido
    FROM DocumentoTecnico d
    WHERE d.IdDocumento = @IdDocumento AND d.Contenido IS NOT NULL;
END

GO

