-- Contadores del tablero del vendedor (T-02 / CRMGPSC-025): baterías por atender y seguimientos atrasados del usuario.
-- Todo se calcula con la fecha y hora de Costa Rica. "Abiertos" = recordatorios Pendiente o Notificado.
--   BateriasHoy: abiertos cuya fecha de recordatorio es hoy.        BateriasVencidas: abiertos cuya fecha ya pasó.
--   BateriasProximas: abiertos que vencen en los próximos 30 días.  SeguimientosAtrasados / SeguimientosHoy: del usuario, aún sin cerrar.
CREATE PROCEDURE [dbo].[sp_CrmRecordatorio_Resumen]
    @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Ahora DATETIME2(0) = dbo.fn_CrmAhora();
    DECLARE @Hoy DATE = CONVERT(date, @Ahora);

    SELECT
        (SELECT COUNT(*) FROM RecordatorioBateria WHERE IdVendedor = @IdUsuario AND Estado IN ('Pendiente', 'Notificado') AND FechaRecordatorio = @Hoy) AS BateriasHoy,
        (SELECT COUNT(*) FROM RecordatorioBateria WHERE IdVendedor = @IdUsuario AND Estado IN ('Pendiente', 'Notificado') AND FechaRecordatorio < @Hoy) AS BateriasVencidas,
        (SELECT COUNT(*) FROM RecordatorioBateria WHERE IdVendedor = @IdUsuario AND Estado IN ('Pendiente', 'Notificado')
            AND FechaRecordatorio > @Hoy AND FechaRecordatorio <= DATEADD(DAY, 30, @Hoy)) AS BateriasProximas,
        (SELECT COUNT(*) FROM SeguimientoCRM WHERE IdResponsable = @IdUsuario
            AND (Estado = 'Atrasado' OR (Estado = 'Pendiente' AND FechaHora < @Ahora))) AS SeguimientosAtrasados,
        (SELECT COUNT(*) FROM SeguimientoCRM WHERE IdResponsable = @IdUsuario AND Estado IN ('Pendiente', 'Atrasado')
            AND CONVERT(date, FechaHora) = @Hoy) AS SeguimientosHoy;
END
