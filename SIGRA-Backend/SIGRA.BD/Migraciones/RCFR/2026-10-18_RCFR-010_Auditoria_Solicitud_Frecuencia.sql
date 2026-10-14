/*
  SIGRA - Migración 2026-10-18: RCFR-010 Bitácora de auditoría de una solicitud de frecuencia.
  Requiere haber ejecutado antes los scripts RCFR-001 a RCFR-006.
  Ejecutar sobre la base de datos SIGRA (es idempotente: se puede correr varias veces).
  Si usa sqlcmd use: sqlcmd -S servidor -d SIGRA -E -I -f 65001 -i archivo.sql  (-f 65001 = UTF-8, necesario para las tildes; -I = QUOTED_IDENTIFIER ON).
  En SSMS basta con abrir el archivo y ejecutarlo (el archivo ya trae BOM UTF-8).

  La bitácora es la tabla Auditoria que ya existía: cada acción sobre una solicitud (registro, documentos, otorgamiento,
  renovación, cancelación, alertas, vencimiento) queda registrada con el usuario responsable y la fecha/hora (UTC).

  Cambios:
  1. Trigger trg_Auditoria_SoloLectura (nuevo): la bitácora pasa a ser de SOLO LECTURA. Cualquier UPDATE o DELETE sobre
     Auditoria, incluso de un administrador o con acceso directo a la base, se rechaza con el mensaje
     "La bitácora de auditoría es de solo lectura...". Solo se pueden agregar eventos nuevos.
     (Importante: si se necesita depurar la tabla en un ambiente de pruebas hay que deshabilitar el trigger a propósito.)
  2. sp_Frecuencia_Auditoria (nuevo): devuelve, en orden cronológico, todos los eventos de una solicitud con el usuario
     responsable ("Sistema" para los automáticos) y la fecha/hora exacta.
  3. Índice IX_Auditoria_Entidad_Fecha para consultar la bitácora de una entidad ordenada por fecha.
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

CREATE OR ALTER TRIGGER dbo.trg_Auditoria_SoloLectura
ON dbo.Auditoria
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50001, N'La bitácora de auditoría es de solo lectura: sus eventos no se pueden modificar ni eliminar, para preservar la trazabilidad.', 1;
END

GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Auditoria_Entidad_Fecha' AND object_id = OBJECT_ID('dbo.Auditoria'))
    CREATE NONCLUSTERED INDEX IX_Auditoria_Entidad_Fecha ON dbo.Auditoria (Entidad ASC, IdEntidad ASC, Fecha ASC);
GO

CREATE OR ALTER PROCEDURE sp_Frecuencia_Auditoria
    @IdSolicitud INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Fecha está en UTC. Los eventos automáticos (alertas, vencimientos) no tienen usuario.
    SELECT a.IdAuditoria, a.Fecha, a.IdUsuario, u.Nombre AS Usuario, r.Nombre AS Rol, a.Accion, a.Detalle
    FROM Auditoria a
    LEFT JOIN Usuario u ON u.IdUsuario = a.IdUsuario
    LEFT JOIN Rol r ON r.IdRol = u.IdRol
    WHERE a.Entidad = 'SolicitudFrecuencia' AND a.IdEntidad = @IdSolicitud
    ORDER BY a.Fecha, a.IdAuditoria;
END

GO
