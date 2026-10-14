/*
  SIGRA - Migración 2026-10-13: RCFR-002 Registro del otorgamiento de una frecuencia.
  Requiere haber ejecutado antes 2026-10-13_RCFR-001_Solicitud_Frecuencia.sql.
  Ejecutar sobre la base de datos SIGRA (es idempotente: se puede correr varias veces).
  Si usa sqlcmd use: sqlcmd -S servidor -d SIGRA -E -I -f 65001 -i archivo.sql  (-f 65001 = UTF-8, necesario para las tildes; -I = QUOTED_IDENTIFIER ON).
  En SSMS basta con abrir el archivo y ejecutarlo (el archivo ya trae BOM UTF-8).

  Cambios:
  1. SolicitudFrecuencia: se agregan FechaOtorgamiento y NumeroResolucion (resolución o expediente gubernamental).
     FechaVencimiento (que ya existía) guarda el vencimiento calculado: fecha de otorgamiento + 5 años.
  2. CK_SolicitudFrecuencia_Fechas: el vencimiento se compara contra la fecha de presentación del trámite
     (antes contra la fecha de registro), para poder registrar frecuencias otorgadas hace tiempo.
  3. sp_Solicitud_Otorgar (nuevo): pasa la solicitud de "En solicitud" a "Otorgada", calcula el vencimiento y la deja "Vigente".
  4. sp_Solicitud_Listar: ahora devuelve también FechaOtorgamiento y NumeroResolucion.
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ---------- 1. Columnas del otorgamiento ----------
IF COL_LENGTH('dbo.SolicitudFrecuencia', 'FechaOtorgamiento') IS NULL
    ALTER TABLE dbo.SolicitudFrecuencia ADD FechaOtorgamiento DATE NULL;
IF COL_LENGTH('dbo.SolicitudFrecuencia', 'NumeroResolucion') IS NULL
    ALTER TABLE dbo.SolicitudFrecuencia ADD NumeroResolucion VARCHAR(100) NULL;
GO

-- ---------- 2. Regla de fechas ----------
IF EXISTS (SELECT 1 FROM sys.check_constraints
           WHERE name = 'CK_SolicitudFrecuencia_Fechas' AND parent_object_id = OBJECT_ID('dbo.SolicitudFrecuencia')
             AND definition NOT LIKE '%FechaPresentacion%')
    ALTER TABLE dbo.SolicitudFrecuencia DROP CONSTRAINT CK_SolicitudFrecuencia_Fechas;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_SolicitudFrecuencia_Fechas' AND parent_object_id = OBJECT_ID('dbo.SolicitudFrecuencia'))
    ALTER TABLE dbo.SolicitudFrecuencia ADD CONSTRAINT CK_SolicitudFrecuencia_Fechas
        CHECK (FechaVencimiento IS NULL OR FechaVencimiento > ISNULL(FechaPresentacion, FechaSolicitud));
GO

-- ---------- 3. Procedimientos almacenados ----------
CREATE OR ALTER PROCEDURE sp_Solicitud_Otorgar
    @IdSolicitud      INT,
    @FechaOtorgamiento DATE,
    @NumeroResolucion VARCHAR(100)
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
           OR s.NumeroResolucion LIKE '%' + @Texto + '%' OR v.Nombre LIKE '%' + @Texto + '%'
           OR 'SF-' + RIGHT('0000' + CAST(s.IdSolicitud AS VARCHAR(10)), 4) LIKE '%' + @Texto + '%')
    ORDER BY s.IdSolicitud DESC;
END

GO
