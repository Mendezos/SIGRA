/*
  SIGRA - Migración 2026-10-17: RCFR-006 Búsqueda y filtros de solicitudes de frecuencia.
  Requiere haber ejecutado antes los scripts RCFR-001 a RCFR-005.
  Ejecutar sobre la base de datos SIGRA (es idempotente: se puede correr varias veces).
  Si usa sqlcmd use: sqlcmd -S servidor -d SIGRA -E -I -f 65001 -i archivo.sql  (-f 65001 = UTF-8, necesario para las tildes; -I = QUOTED_IDENTIFIER ON).
  En SSMS basta con abrir el archivo y ejecutarlo (el archivo ya trae BOM UTF-8).

  No cambia la estructura de las tablas. Cambios:
  1. sp_Solicitud_Listar: se agregan los filtros @Cliente (nombre de la empresa, coincidencia parcial) y
     @Zona (zona geográfica de cobertura, coincidencia parcial). Los filtros ya existentes (@Texto, @Estado, @IdVendedor)
     y los nuevos se combinan: una solicitud debe cumplir TODOS los que se indiquen.
  2. Índice IX_SolicitudFrecuencia_Estado ya existe desde RCFR-003; se agrega IX_SolicitudFrecuencia_IdCliente_Estado
     para las consultas por cliente y estado.
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

CREATE OR ALTER PROCEDURE sp_Solicitud_Listar
    @IdSolicitud INT = NULL,
    @Texto       VARCHAR(100) = NULL,   -- búsqueda libre: cliente, repetidora, frecuencia, zona, resolución, vendedor o código SF-0000
    @Estado      VARCHAR(30) = NULL,
    @IdVendedor  INT = NULL,            -- vendedor responsable (un vendedor solo ve las suyas)
    @Cliente     VARCHAR(150) = NULL,   -- nombre de la empresa (coincidencia parcial)
    @Zona        VARCHAR(200) = NULL    -- zona geográfica de cobertura (coincidencia parcial)
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
      AND (@Cliente IS NULL OR c.Empresa LIKE '%' + @Cliente + '%')
      AND (@Zona IS NULL OR s.ZonaCobertura LIKE '%' + @Zona + '%')
      AND (@Texto IS NULL OR c.Empresa LIKE '%' + @Texto + '%' OR e.NumeroSerie LIKE '%' + @Texto + '%'
           OR s.Frecuencia LIKE '%' + @Texto + '%' OR s.ZonaCobertura LIKE '%' + @Texto + '%'
           OR s.NumeroResolucion LIKE '%' + @Texto + '%' OR v.Nombre LIKE '%' + @Texto + '%'
           OR 'SF-' + RIGHT('0000' + CAST(s.IdSolicitud AS VARCHAR(10)), 4) LIKE '%' + @Texto + '%')
    ORDER BY s.IdSolicitud DESC;
END

GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SolicitudFrecuencia_IdCliente_Estado' AND object_id = OBJECT_ID('dbo.SolicitudFrecuencia'))
    CREATE NONCLUSTERED INDEX IX_SolicitudFrecuencia_IdCliente_Estado ON dbo.SolicitudFrecuencia (IdCliente ASC, Estado ASC);
GO
