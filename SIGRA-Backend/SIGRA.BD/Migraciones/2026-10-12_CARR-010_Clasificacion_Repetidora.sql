/*
  SIGRA - Migración 2026-10-12: CARR-010 Clasificación de repetidoras (alquilada por Radifax / propia del cliente).
  Ejecutar sobre la base de datos SIGRA (es idempotente: se puede correr varias veces).
  Si usa sqlcmd use: sqlcmd -S servidor -d SIGRA -E -I -f 65001 -i archivo.sql  (-f 65001 = UTF-8, necesario para las tildes; -I = QUOTED_IDENTIFIER ON).
  En SSMS basta con abrir el archivo y ejecutarlo (el archivo ya trae BOM UTF-8).
  Requisito: tener aplicada la migración 2026-10-12_CARR-009_Ficha_Tecnica_Repetidora.sql.

  Cambios:
  1. RepetidoraDetalle.Clasificacion ('Alquilada por Radifax' | 'Propia del cliente') con CHECK.
     Las fichas anteriores quedan con Clasificacion NULL (sin clasificar) hasta que se editen.
  2. RepetidoraDetalle.Facturable (columna calculada y persistida): 1 = alquilada por Radifax,
     0 = propia del cliente (sin cobro), NULL = sin clasificar. Es la columna que debe leer el módulo de facturación.
  3. sp_Repetidora_Listar (nuevo filtro @Facturable), sp_Repetidora_Obtener y sp_Repetidora_Guardar actualizados.
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF COL_LENGTH('dbo.RepetidoraDetalle', 'Clasificacion') IS NULL
    ALTER TABLE dbo.RepetidoraDetalle ADD Clasificacion VARCHAR(30) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_RepetidoraDetalle_Clasificacion')
    ALTER TABLE dbo.RepetidoraDetalle ADD CONSTRAINT CK_RepetidoraDetalle_Clasificacion
        CHECK (Clasificacion IS NULL OR Clasificacion IN ('Alquilada por Radifax', 'Propia del cliente'));
GO

IF COL_LENGTH('dbo.RepetidoraDetalle', 'Facturable') IS NULL
    ALTER TABLE dbo.RepetidoraDetalle ADD Facturable AS (CONVERT(BIT,
        CASE WHEN Clasificacion = 'Alquilada por Radifax' THEN 1 WHEN Clasificacion = 'Propia del cliente' THEN 0 END)) PERSISTED;
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
    WHERE e.NumeroSerie = @NumeroSerie;
END

GO

CREATE OR ALTER PROCEDURE sp_Repetidora_Guardar
    @IdEquipo             INT,
    @Frecuencia           VARCHAR(30),
    @FrecuenciaRecepcion  VARCHAR(30),
    @Potencia             VARCHAR(30),
    @Accesorios           VARCHAR(500) = NULL,
    @DireccionInstalacion VARCHAR(200),
    @CoordenadasGPS       VARCHAR(50) = NULL,
    @Clasificacion        VARCHAR(30),   -- 'Alquilada por Radifax' (facturable) o 'Propia del cliente' (sin cobro)
    @IdUsuario            INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Existia BIT = CASE WHEN EXISTS (SELECT 1 FROM RepetidoraDetalle WHERE IdEquipo = @IdEquipo) THEN 1 ELSE 0 END;

    BEGIN TRANSACTION;

    IF @Existia = 1
        UPDATE RepetidoraDetalle
        SET Frecuencia = @Frecuencia, FrecuenciaRecepcion = @FrecuenciaRecepcion, Potencia = @Potencia,
            Accesorios = @Accesorios, DireccionInstalacion = @DireccionInstalacion, CoordenadasGPS = @CoordenadasGPS,
            Clasificacion = @Clasificacion, IdUsuarioRegistro = @IdUsuario
        WHERE IdEquipo = @IdEquipo;
    ELSE
        INSERT INTO RepetidoraDetalle (IdEquipo, Frecuencia, FrecuenciaRecepcion, Potencia, Accesorios, DireccionInstalacion, CoordenadasGPS, Clasificacion, IdUsuarioRegistro)
        VALUES (@IdEquipo, @Frecuencia, @FrecuenciaRecepcion, @Potencia, @Accesorios, @DireccionInstalacion, @CoordenadasGPS, @Clasificacion, @IdUsuario);

    INSERT INTO BitacoraEquipo (IdEquipo, Descripcion)
    VALUES (@IdEquipo, CASE WHEN @Existia = 1 THEN N'Ficha técnica de la repetidora actualizada.' ELSE N'Ficha técnica de la repetidora registrada.' END
                       + N' Instalación: ' + @DireccionInstalacion + N'. Clasificación: ' + @Clasificacion + N' ('
                       + CASE WHEN @Clasificacion = 'Alquilada por Radifax'
                              THEN N'facturable en los reportes de alquiler'
                              ELSE N'sin cobro; seguimiento solo por bitácora de garantía y control administrativo' END
                       + N').');

    COMMIT TRANSACTION;
END

GO

