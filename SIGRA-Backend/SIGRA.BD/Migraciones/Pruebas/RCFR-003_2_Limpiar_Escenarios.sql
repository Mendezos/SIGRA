/*
  SIGRA - Limpieza de los datos de prueba de RCFR-003 (borra solo lo creado por RCFR-003_1_Preparar_Escenarios.sql).
  Ejecutar: sqlcmd -S localhost -d SIGRA -E -I -f 65001 -i RCFR-003_2_Limpiar_Escenarios.sql
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;
GO

DECLARE @Prueba TABLE (IdSolicitud INT PRIMARY KEY);
INSERT INTO @Prueba SELECT IdSolicitud FROM SolicitudFrecuencia WHERE ZonaCobertura LIKE '[[]PRUEBA RCFR-003]%';

DELETE FROM AlertaFrecuencia WHERE IdSolicitud IN (SELECT IdSolicitud FROM @Prueba);
DELETE FROM DocumentoFrecuencia WHERE IdSolicitud IN (SELECT IdSolicitud FROM @Prueba);
-- Primero las renovaciones (apuntan a la original) y luego las originales.
DELETE FROM SolicitudFrecuencia WHERE IdSolicitud IN (SELECT IdSolicitud FROM @Prueba) AND IdSolicitudOrigen IS NOT NULL;
DELETE FROM SolicitudFrecuencia WHERE IdSolicitud IN (SELECT IdSolicitud FROM @Prueba);

SELECT COUNT(*) AS SolicitudesDePruebaRestantes FROM SolicitudFrecuencia WHERE ZonaCobertura LIKE '[[]PRUEBA RCFR-003]%';
GO
