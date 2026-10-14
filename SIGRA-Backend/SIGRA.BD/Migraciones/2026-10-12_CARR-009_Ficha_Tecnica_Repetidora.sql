/*
  SIGRA - Migración 2026-10-12: CARR-009 Ficha técnica de repetidoras en contratos de alquiler.
  Ejecutar sobre la base de datos SIGRA (es idempotente: se puede correr varias veces).
  Si usa sqlcmd use: sqlcmd -S servidor -d SIGRA -E -I -f 65001 -i archivo.sql  (-f 65001 = UTF-8, necesario para las tildes; -I = QUOTED_IDENTIFIER ON).
  En SSMS basta con abrir el archivo y ejecutarlo (el archivo ya trae BOM UTF-8).

  Requisito: tener aplicado el esquema del Sprint 2 (tablas Contrato/ContratoEquipo/Equipo con
  los campos nuevos y los SP de alquiler). Publicar el proyecto SIGRA.BD lo incluye.

  Cambios:
  1. RepetidoraDetalle: se agregan FrecuenciaRecepcion, Accesorios, FechaRegistro e IdUsuarioRegistro.
     (Frecuencia pasa a ser la frecuencia de transmisión.)
  2. Nuevos SP: sp_Repetidora_Listar, sp_Repetidora_Obtener, sp_Repetidora_Guardar.
  3. Permisos: Coordinador técnico y Técnico (Departamento de Instalaciones) pasan a tener
     Lectura y Escritura/Edición sobre el módulo "Alquiler de radios y repetidoras".
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- 1) Columnas nuevas de la ficha técnica
IF COL_LENGTH('dbo.RepetidoraDetalle', 'FrecuenciaRecepcion') IS NULL
    ALTER TABLE dbo.RepetidoraDetalle ADD FrecuenciaRecepcion VARCHAR(30) NULL;
IF COL_LENGTH('dbo.RepetidoraDetalle', 'Accesorios') IS NULL
    ALTER TABLE dbo.RepetidoraDetalle ADD Accesorios VARCHAR(500) NULL;
IF COL_LENGTH('dbo.RepetidoraDetalle', 'FechaRegistro') IS NULL
    ALTER TABLE dbo.RepetidoraDetalle ADD FechaRegistro DATETIME NOT NULL
        CONSTRAINT DF_RepetidoraDetalle_FechaRegistro DEFAULT (GETDATE());
IF COL_LENGTH('dbo.RepetidoraDetalle', 'IdUsuarioRegistro') IS NULL
    ALTER TABLE dbo.RepetidoraDetalle ADD IdUsuarioRegistro INT NULL
        CONSTRAINT FK_RepetidoraDetalle_Usuario FOREIGN KEY REFERENCES dbo.Usuario (IdUsuario);
GO

-- 2) Procedimientos almacenados
CREATE OR ALTER PROCEDURE sp_Repetidora_Listar
    @Texto VARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Repetidoras que están (o estuvieron) asignadas a un contrato, con el estado de su ficha técnica.
    SELECT e.IdEquipo, e.NumeroSerie, m.Marca, m.Modelo, cat.Nombre AS Categoria, e.Estado,
           ce.IdContrato, cl.Empresa, ct.Estado AS EstadoContrato, ce.FechaAsignacion,
           CAST(CASE WHEN rd.IdEquipo IS NULL THEN 0 ELSE 1 END AS BIT) AS TieneFicha,
           rd.Frecuencia, rd.FrecuenciaRecepcion, rd.Potencia, rd.Accesorios, rd.DireccionInstalacion, rd.CoordenadasGPS,
           rd.FechaRegistro, u.Nombre AS RegistradoPor
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
           rd.Frecuencia, rd.FrecuenciaRecepcion, rd.Potencia, rd.Accesorios, rd.DireccionInstalacion, rd.CoordenadasGPS,
           rd.FechaRegistro, u.Nombre AS RegistradoPor
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
            IdUsuarioRegistro = @IdUsuario
        WHERE IdEquipo = @IdEquipo;
    ELSE
        INSERT INTO RepetidoraDetalle (IdEquipo, Frecuencia, FrecuenciaRecepcion, Potencia, Accesorios, DireccionInstalacion, CoordenadasGPS, IdUsuarioRegistro)
        VALUES (@IdEquipo, @Frecuencia, @FrecuenciaRecepcion, @Potencia, @Accesorios, @DireccionInstalacion, @CoordenadasGPS, @IdUsuario);

    INSERT INTO BitacoraEquipo (IdEquipo, Descripcion)
    VALUES (@IdEquipo, CASE WHEN @Existia = 1 THEN N'Ficha técnica de la repetidora actualizada.' ELSE N'Ficha técnica de la repetidora registrada.' END
                       + N' Instalación: ' + @DireccionInstalacion + N'.');

    COMMIT TRANSACTION;
END

GO

-- 3) Permisos del Departamento de Instalaciones sobre Alquiler (módulo 3)
MERGE dbo.RolPermiso AS destino
USING (
    SELECT r.IdRol, p.IdPermiso
    FROM dbo.Rol r
    CROSS JOIN dbo.Permiso p
    WHERE p.IdModulo = 3
      AND r.Nombre IN (N'Coordinador técnico', N'Coordinador tecnico', N'Técnico', N'Tecnico')
) AS origen
ON destino.IdRol = origen.IdRol AND destino.IdPermiso = origen.IdPermiso
WHEN MATCHED THEN
    UPDATE SET Lectura = 1, Escritura = 1, Edicion = 1
WHEN NOT MATCHED THEN
    INSERT (IdRol, IdPermiso, Lectura, Escritura, Edicion, Eliminacion)
    VALUES (origen.IdRol, origen.IdPermiso, 1, 1, 1, 0);
GO
