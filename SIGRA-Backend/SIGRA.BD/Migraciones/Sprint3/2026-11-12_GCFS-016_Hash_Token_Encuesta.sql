/*
  GCFS-016: los enlaces de encuesta no almacenan el token utilizable.
  La migración conserva los enlaces existentes convirtiendo su GUID a SHA-256
  antes de eliminar la columna que contenía el valor en texto.
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.Encuesta', 'TokenHash') IS NULL
    ALTER TABLE dbo.Encuesta ADD TokenHash VARBINARY(32) NULL;
GO

IF COL_LENGTH('dbo.Encuesta', 'Token') IS NOT NULL
BEGIN
    UPDATE dbo.Encuesta
    SET TokenHash = HASHBYTES('SHA2_256', CONVERT(varchar(36), Token))
    WHERE TokenHash IS NULL;

    IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_Encuesta_Token')
        ALTER TABLE dbo.Encuesta DROP CONSTRAINT UQ_Encuesta_Token;
    IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_Encuesta_Token')
        ALTER TABLE dbo.Encuesta DROP CONSTRAINT DF_Encuesta_Token;
    ALTER TABLE dbo.Encuesta DROP COLUMN Token;
END
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Encuesta') AND name = 'TokenHash' AND is_nullable = 1)
    ALTER TABLE dbo.Encuesta ALTER COLUMN TokenHash VARBINARY(32) NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_Encuesta_TokenHash')
    ALTER TABLE dbo.Encuesta ADD CONSTRAINT UQ_Encuesta_TokenHash UNIQUE (TokenHash);
GO
