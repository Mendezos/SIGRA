/*
  SIGRA - Migración 2026-10-12: CARR-011 Checklist digital previo a la instalación de una repetidora.
  Ejecutar sobre la base de datos SIGRA (es idempotente: se puede correr varias veces).
  Si usa sqlcmd use: sqlcmd -S servidor -d SIGRA -E -I -f 65001 -i archivo.sql  (-f 65001 = UTF-8, necesario para las tildes; -I = QUOTED_IDENTIFIER ON).
  En SSMS basta con abrir el archivo y ejecutarlo (el archivo ya trae BOM UTF-8).
  Requisito: tener aplicadas las migraciones CARR-009 y CARR-010 de esta misma fecha.

  Cambios:
  1. ChecklistInstalacion: se agregan IdUsuario (quien verificó) y FechaVerificacion (fecha y hora).
  2. Tablas nuevas RequisitoInstalacion (catálogo de requisitos, editable) y ChecklistInstalacionItem
     (resultado por requisito en cada verificación).
  3. Se cargan los 8 requisitos técnicos iniciales.
  4. SP nuevos: sp_Checklist_Obtener y sp_Checklist_Guardar; sp_Repetidora_Listar/Obtener devuelven EstadoChecklist.
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF COL_LENGTH('dbo.ChecklistInstalacion', 'IdUsuario') IS NULL
    ALTER TABLE dbo.ChecklistInstalacion ADD IdUsuario INT NULL
        CONSTRAINT FK_ChecklistInstalacion_Usuario FOREIGN KEY REFERENCES dbo.Usuario (IdUsuario);
IF COL_LENGTH('dbo.ChecklistInstalacion', 'FechaVerificacion') IS NULL
    ALTER TABLE dbo.ChecklistInstalacion ADD FechaVerificacion DATETIME NOT NULL
        CONSTRAINT DF_ChecklistInstalacion_FechaVerificacion DEFAULT (GETDATE());
GO

IF OBJECT_ID('dbo.RequisitoInstalacion') IS NULL
    CREATE TABLE dbo.RequisitoInstalacion (
        IdRequisito INT           IDENTITY (1, 1) NOT NULL,
        Nombre      VARCHAR (200) NOT NULL,
        Orden       INT           NOT NULL,
        Activo      BIT           CONSTRAINT DF_RequisitoInstalacion_Activo DEFAULT ((1)) NOT NULL,
        CONSTRAINT PK_RequisitoInstalacion PRIMARY KEY CLUSTERED (IdRequisito ASC),
        CONSTRAINT UQ_RequisitoInstalacion_Nombre UNIQUE NONCLUSTERED (Nombre ASC)
    );
GO

IF OBJECT_ID('dbo.ChecklistInstalacionItem') IS NULL
    CREATE TABLE dbo.ChecklistInstalacionItem (
        IdChecklist INT NOT NULL,
        IdRequisito INT NOT NULL,
        Cumplido    BIT NOT NULL,
        CONSTRAINT PK_ChecklistInstalacionItem PRIMARY KEY CLUSTERED (IdChecklist ASC, IdRequisito ASC),
        CONSTRAINT FK_ChecklistInstalacionItem_Checklist FOREIGN KEY (IdChecklist) REFERENCES dbo.ChecklistInstalacion (IdChecklist),
        CONSTRAINT FK_ChecklistInstalacionItem_Requisito FOREIGN KEY (IdRequisito) REFERENCES dbo.RequisitoInstalacion (IdRequisito)
    );
GO

INSERT INTO dbo.RequisitoInstalacion (Nombre, Orden)
SELECT v.Nombre, v.Orden
FROM (VALUES
    (N'Sitio de instalación accesible y autorizado por el cliente', 1),
    (N'Energía eléctrica disponible y estable en el sitio', 2),
    (N'Torre o mástil en condiciones de soportar la antena', 3),
    (N'Sistema de puesta a tierra y protección contra descargas', 4),
    (N'Antena y línea de transmisión (cable coaxial) verificadas', 5),
    (N'Duplexor y accesorios completos según la ficha técnica', 6),
    (N'Frecuencias de transmisión y recepción autorizadas', 7),
    (N'Equipo probado en taller antes de salir al sitio', 8)
) AS v(Nombre, Orden)
WHERE NOT EXISTS (SELECT 1 FROM dbo.RequisitoInstalacion r WHERE r.Nombre = v.Nombre);
GO

CREATE OR ALTER PROCEDURE sp_Repetidora_Listar
    @Texto      VARCHAR(100) = NULL,
    @Facturable BIT = NULL   -- 1 = solo las facturables (reporte de facturación), 0 = solo las sin cobro
AS
BEGIN
    SET NOCOUNT ON;

    -- Repetidoras que están (o estuvieron) asignadas a un contrato, con el estado de su ficha técnica.
    SELECT e.IdEquipo, e.NumeroSerie, m.Marca, m.Modelo, cat.Nombre AS Categoria, e.Estado,
           ce.IdContrato, cl.Empresa, ct.Estado AS EstadoContrato, ce.FechaAsignacion,
           CAST(CASE WHEN rd.IdEquipo IS NULL THEN 0 ELSE 1 END AS BIT) AS TieneFicha,
           CAST(ISNULL(rd.Facturable, 0) AS BIT) AS Facturable,
           rd.Frecuencia, rd.FrecuenciaRecepcion, rd.Potencia, rd.Accesorios, rd.DireccionInstalacion, rd.CoordenadasGPS,
           CASE WHEN ck.Completado IS NULL THEN N'Sin checklist' WHEN ck.Completado = 1 THEN N'Completo' ELSE N'Incompleto' END AS EstadoChecklist,
           rd.Clasificacion, rd.FechaRegistro, u.Nombre AS RegistradoPor
    FROM Equipo e
    INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    INNER JOIN CategoriaEquipo cat ON cat.IdCategoria = m.IdCategoria
    INNER JOIN ContratoEquipo ce ON ce.IdEquipo = e.IdEquipo
        AND ce.IdContratoEquipo = (SELECT MAX(x.IdContratoEquipo) FROM ContratoEquipo x WHERE x.IdEquipo = e.IdEquipo)
    INNER JOIN Contrato ct ON ct.IdContrato = ce.IdContrato
    INNER JOIN Cliente cl ON cl.IdCliente = ct.IdCliente
    LEFT JOIN RepetidoraDetalle rd ON rd.IdEquipo = e.IdEquipo
    LEFT JOIN Usuario u ON u.IdUsuario = rd.IdUsuarioRegistro
    OUTER APPLY (SELECT TOP 1 c.Completado FROM ChecklistInstalacion c WHERE c.IdEquipo = e.IdEquipo ORDER BY c.IdChecklist DESC) ck
    WHERE cat.Nombre = N'Repetidora'
      AND (@Facturable IS NULL OR (rd.IdEquipo IS NOT NULL AND rd.Facturable = @Facturable))
      AND (@Texto IS NULL OR e.NumeroSerie LIKE '%' + @Texto + '%' OR m.Modelo LIKE '%' + @Texto + '%'
           OR cl.Empresa LIKE '%' + @Texto + '%' OR rd.DireccionInstalacion LIKE '%' + @Texto + '%')
    ORDER BY TieneFicha, ce.FechaAsignacion DESC, e.NumeroSerie;
END

GO

CREATE OR ALTER PROCEDURE sp_Repetidora_Obtener
    @NumeroSerie VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    -- Devuelve el equipo aunque no tenga contrato, para que el flujo pueda dar el mensaje de negocio adecuado.
    SELECT e.IdEquipo, e.NumeroSerie, m.Marca, m.Modelo, cat.Nombre AS Categoria, e.Estado,
           ce.IdContrato, cl.Empresa, ct.Estado AS EstadoContrato, ce.FechaAsignacion,
           CAST(CASE WHEN rd.IdEquipo IS NULL THEN 0 ELSE 1 END AS BIT) AS TieneFicha,
           CAST(ISNULL(rd.Facturable, 0) AS BIT) AS Facturable,
           rd.Frecuencia, rd.FrecuenciaRecepcion, rd.Potencia, rd.Accesorios, rd.DireccionInstalacion, rd.CoordenadasGPS,
           CASE WHEN ck.Completado IS NULL THEN N'Sin checklist' WHEN ck.Completado = 1 THEN N'Completo' ELSE N'Incompleto' END AS EstadoChecklist,
           rd.Clasificacion, rd.FechaRegistro, u.Nombre AS RegistradoPor
    FROM Equipo e
    INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    INNER JOIN CategoriaEquipo cat ON cat.IdCategoria = m.IdCategoria
    LEFT JOIN ContratoEquipo ce ON ce.IdEquipo = e.IdEquipo
        AND ce.IdContratoEquipo = (SELECT MAX(x.IdContratoEquipo) FROM ContratoEquipo x WHERE x.IdEquipo = e.IdEquipo)
    LEFT JOIN Contrato ct ON ct.IdContrato = ce.IdContrato
    LEFT JOIN Cliente cl ON cl.IdCliente = ct.IdCliente
    LEFT JOIN RepetidoraDetalle rd ON rd.IdEquipo = e.IdEquipo
    LEFT JOIN Usuario u ON u.IdUsuario = rd.IdUsuarioRegistro
    OUTER APPLY (SELECT TOP 1 c.Completado FROM ChecklistInstalacion c WHERE c.IdEquipo = e.IdEquipo ORDER BY c.IdChecklist DESC) ck
    WHERE e.NumeroSerie = @NumeroSerie;
END

GO

CREATE OR ALTER PROCEDURE sp_Checklist_Obtener
    @IdEquipo INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdUltimo INT = (SELECT TOP 1 IdChecklist FROM ChecklistInstalacion WHERE IdEquipo = @IdEquipo ORDER BY IdChecklist DESC);

    -- 1) Requisitos vigentes con el resultado de la última verificación (no cumplido si no hay verificación).
    SELECT r.IdRequisito, r.Nombre, CAST(ISNULL(i.Cumplido, 0) AS BIT) AS Cumplido
    FROM RequisitoInstalacion r
    LEFT JOIN ChecklistInstalacionItem i ON i.IdRequisito = r.IdRequisito AND i.IdChecklist = @IdUltimo
    WHERE r.Activo = 1
    ORDER BY r.Orden, r.IdRequisito;

    -- 2) Última verificación
    SELECT c.IdChecklist, c.FechaVerificacion, c.Completado, c.Observaciones, u.Nombre AS Usuario,
           (SELECT COUNT(*) FROM ChecklistInstalacionItem x WHERE x.IdChecklist = c.IdChecklist AND x.Cumplido = 0) AS Pendientes
    FROM ChecklistInstalacion c
    LEFT JOIN Usuario u ON u.IdUsuario = c.IdUsuario
    WHERE c.IdChecklist = @IdUltimo;

    -- 3) Historial de verificaciones
    SELECT TOP 20 c.IdChecklist, c.FechaVerificacion, c.Completado, c.Observaciones, u.Nombre AS Usuario,
           (SELECT COUNT(*) FROM ChecklistInstalacionItem x WHERE x.IdChecklist = c.IdChecklist AND x.Cumplido = 0) AS Pendientes
    FROM ChecklistInstalacion c
    LEFT JOIN Usuario u ON u.IdUsuario = c.IdUsuario
    WHERE c.IdEquipo = @IdEquipo
    ORDER BY c.IdChecklist DESC;
END

GO

CREATE OR ALTER PROCEDURE sp_Checklist_Guardar
    @IdEquipo       INT,
    @IdsCumplidos   VARCHAR(MAX) = NULL,   -- ids de requisito cumplidos separados por coma; el resto queda como no cumplido
    @Observaciones  VARCHAR(MAX) = NULL,
    @IdUsuario      INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Cumplidos TABLE (IdRequisito INT PRIMARY KEY);
    INSERT INTO @Cumplidos (IdRequisito)
    SELECT DISTINCT CAST(value AS INT) FROM STRING_SPLIT(ISNULL(@IdsCumplidos, ''), ',') WHERE LTRIM(RTRIM(value)) <> '';

    DECLARE @Pendientes INT = (
        SELECT COUNT(*) FROM RequisitoInstalacion r
        WHERE r.Activo = 1 AND NOT EXISTS (SELECT 1 FROM @Cumplidos c WHERE c.IdRequisito = r.IdRequisito));
    DECLARE @Completado BIT = CASE WHEN @Pendientes = 0 THEN 1 ELSE 0 END;
    DECLARE @IdChecklist INT;

    BEGIN TRANSACTION;

    INSERT INTO ChecklistInstalacion (IdEquipo, Completado, Observaciones, IdUsuario)
    VALUES (@IdEquipo, @Completado, @Observaciones, @IdUsuario);
    SET @IdChecklist = SCOPE_IDENTITY();

    INSERT INTO ChecklistInstalacionItem (IdChecklist, IdRequisito, Cumplido)
    SELECT @IdChecklist, r.IdRequisito, CASE WHEN c.IdRequisito IS NULL THEN 0 ELSE 1 END
    FROM RequisitoInstalacion r
    LEFT JOIN @Cumplidos c ON c.IdRequisito = r.IdRequisito
    WHERE r.Activo = 1;

    INSERT INTO BitacoraEquipo (IdEquipo, Descripcion)
    VALUES (@IdEquipo, CASE WHEN @Completado = 1
        THEN N'Checklist previo a la instalación completo: la repetidora quedó lista para instalación.'
        ELSE N'Checklist previo a la instalación incompleto: ' + CAST(@Pendientes AS NVARCHAR(10)) + N' requisito(s) pendiente(s).' END);

    COMMIT TRANSACTION;

    SELECT @IdChecklist;
END

GO

