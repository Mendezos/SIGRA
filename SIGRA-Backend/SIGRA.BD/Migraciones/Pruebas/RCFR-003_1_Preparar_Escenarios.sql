/*
  SIGRA - Datos de prueba para RCFR-003 (alertas de vencimiento de frecuencias).
  Crea frecuencias "Vigentes" con fechas de vencimiento calculadas respecto a HOY, para que la verificación
  automática (o el botón "Ejecutar verificación ahora") genere cada tipo de alerta.
  Todas quedan marcadas con la zona "[PRUEBA RCFR-003]" para poder borrarlas con RCFR-003_2_Limpiar_Escenarios.sql.

  Requiere: el cliente "Bomberos de Costa Rica" con la repetidora SN-77003 en un contrato, y al menos un vendedor activo.
  Ejecutar: sqlcmd -S localhost -d SIGRA -E -I -f 65001 -i RCFR-003_1_Preparar_Escenarios.sql

  Resultado esperado al ejecutar la verificación (las frecuencias se identifican por la frecuencia en MHz):
    461.001 MHz  vence en 6 meses exactos        -> alerta PRIMERA, estado "Por renovar"
    461.002 MHz  vence en 3 meses, ya tenía la primera alerta, sin renovación -> alerta SEGUNDA
    461.003 MHz  vence en 30 días, sin renovación -> alerta FINAL (urgente), resaltada en el dashboard
    461.004 MHz  vence HOY                        -> estado "Vencida" (aparece en el reporte de vencidas)
    461.005 MHz  vence en 3 meses, ya tenía la primera alerta y tiene renovación iniciada -> NO genera segunda alerta (queda "En renovación")
    461.006 MHz  Cancelada (RCFR-004): al intentar renovarla debe salir "No es posible renovar una frecuencia cancelada"
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;
GO

DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);
DECLARE @IdCliente INT = (SELECT TOP 1 IdCliente FROM Cliente WHERE Empresa = N'Bomberos de Costa Rica');
DECLARE @IdEquipo INT = (SELECT TOP 1 IdEquipo FROM Equipo WHERE NumeroSerie = 'SN-77003');
DECLARE @IdVendedor INT = (SELECT TOP 1 u.IdUsuario FROM Usuario u INNER JOIN Rol r ON r.IdRol = u.IdRol
                           WHERE r.Nombre = 'Vendedor / Ejecutivo de cuenta' AND u.Activo = 1 ORDER BY u.IdUsuario);

IF @IdCliente IS NULL OR @IdEquipo IS NULL OR @IdVendedor IS NULL
BEGIN
    RAISERROR(N'Falta el cliente Bomberos de Costa Rica, la repetidora SN-77003 o un vendedor activo.', 16, 1);
    RETURN;
END

DECLARE @Casos TABLE (Frecuencia VARCHAR(30), Vencimiento DATE);
INSERT INTO @Casos VALUES
    ('461.001 MHz', DATEADD(MONTH, 6, @Hoy)),
    ('461.002 MHz', DATEADD(MONTH, 3, @Hoy)),
    ('461.003 MHz', DATEADD(DAY, 30, @Hoy)),
    ('461.004 MHz', @Hoy),
    ('461.005 MHz', DATEADD(MONTH, 3, @Hoy)),
    ('461.006 MHz', DATEADD(YEAR, 1, @Hoy));   -- RCFR-004: frecuencia cancelada, no se puede renovar

INSERT INTO SolicitudFrecuencia (IdCliente, IdEquipo, IdUsuario, Estado, Frecuencia, Banda, Potencia, ZonaCobertura,
                                 FechaPresentacion, FechaOtorgamiento, NumeroResolucion, FechaVencimiento)
SELECT @IdCliente, @IdEquipo, @IdVendedor, 'Vigente', c.Frecuencia, 'UHF', '40 W', '[PRUEBA RCFR-003]',
       DATEADD(DAY, -30, DATEADD(YEAR, -5, c.Vencimiento)), DATEADD(YEAR, -5, c.Vencimiento),
       'PRUEBA-' + REPLACE(c.Frecuencia, ' MHz', ''), c.Vencimiento
FROM @Casos c
WHERE NOT EXISTS (SELECT 1 FROM SolicitudFrecuencia s WHERE s.Frecuencia = c.Frecuencia AND s.ZonaCobertura = '[PRUEBA RCFR-003]');

-- RCFR-004: 461.006 queda cancelada (no se puede iniciar su renovación).
UPDATE SolicitudFrecuencia SET Estado = 'Cancelada', FechaCancelacion = GETDATE(), MotivoCancelacion = 'Dato de prueba: el cliente ya no requiere la frecuencia.'
WHERE ZonaCobertura = '[PRUEBA RCFR-003]' AND Frecuencia = '461.006 MHz' AND Estado <> 'Cancelada';

-- 461.002 y 461.005 ya habían recibido la primera alerta (simula que se envió hace 3 meses).
INSERT INTO AlertaFrecuencia (IdSolicitud, Tipo, FechaAlerta, FechaVencimiento, IdVendedor, CorreoEnviado, FechaEnvio, IntentosEnvio)
SELECT s.IdSolicitud, 'Primera', DATEADD(MONTH, -3, @Hoy), s.FechaVencimiento, s.IdUsuario, 1, DATEADD(MONTH, -3, GETDATE()), 1
FROM SolicitudFrecuencia s
WHERE s.ZonaCobertura = '[PRUEBA RCFR-003]' AND s.Frecuencia IN ('461.002 MHz', '461.005 MHz')
  AND NOT EXISTS (SELECT 1 FROM AlertaFrecuencia a WHERE a.IdSolicitud = s.IdSolicitud AND a.Tipo = 'Primera');

UPDATE SolicitudFrecuencia SET Estado = 'Por renovar'
WHERE ZonaCobertura = '[PRUEBA RCFR-003]' AND Frecuencia IN ('461.002 MHz', '461.005 MHz') AND Estado = 'Vigente';

-- 461.005 ya tiene una renovación iniciada (solicitud vinculada, en trámite).
INSERT INTO SolicitudFrecuencia (IdCliente, IdEquipo, IdUsuario, Frecuencia, Banda, Potencia, ZonaCobertura, FechaPresentacion, IdSolicitudOrigen)
SELECT o.IdCliente, o.IdEquipo, o.IdUsuario, o.Frecuencia, o.Banda, o.Potencia, '[PRUEBA RCFR-003] renovación', @Hoy, o.IdSolicitud
FROM SolicitudFrecuencia o
WHERE o.ZonaCobertura = '[PRUEBA RCFR-003]' AND o.Frecuencia = '461.005 MHz'
  AND NOT EXISTS (SELECT 1 FROM SolicitudFrecuencia r WHERE r.IdSolicitudOrigen = o.IdSolicitud);

-- La original de una renovación en trámite queda "En renovación" (RCFR-004): no genera más alertas.
UPDATE o SET o.Estado = 'En renovación'
FROM SolicitudFrecuencia o
WHERE o.ZonaCobertura = '[PRUEBA RCFR-003]' AND o.Estado = 'Por renovar'
  AND EXISTS (SELECT 1 FROM SolicitudFrecuencia r WHERE r.IdSolicitudOrigen = o.IdSolicitud AND r.Estado <> 'Cancelada');

SELECT s.IdSolicitud, 'SF-' + RIGHT('0000' + CAST(s.IdSolicitud AS VARCHAR(10)), 4) AS Codigo, s.Frecuencia, s.Estado,
       s.FechaVencimiento, DATEDIFF(DAY, @Hoy, s.FechaVencimiento) AS DiasParaVencer, s.IdSolicitudOrigen
FROM SolicitudFrecuencia s
WHERE s.ZonaCobertura LIKE '[[]PRUEBA RCFR-003]%'
ORDER BY s.IdSolicitud;
GO
