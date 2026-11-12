/*
  SIGRA - Sprint 3 / bloque S4 (CRMGPSC-025 y T-02): índices para los recordatorios de baterías.
  Es idempotente: se puede ejecutar varias veces (normalmente la ejecuta Sincronizar-BD.cjs).
  - IX_RecordatorioBateria_Estado: el servicio de recordatorios busca los "Pendiente" cuya fecha ya llegó.
  - IX_RecordatorioBateria_Factura: sp_CrmBateria_RegistrarDesdeFactura revisa si la factura ya generó recordatorios.
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_RecordatorioBateria_Estado' AND object_id = OBJECT_ID('dbo.RecordatorioBateria'))
    CREATE NONCLUSTERED INDEX [IX_RecordatorioBateria_Estado]
        ON [dbo].[RecordatorioBateria] ([Estado] ASC, [FechaRecordatorio] ASC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_RecordatorioBateria_Factura' AND object_id = OBJECT_ID('dbo.RecordatorioBateria'))
    CREATE NONCLUSTERED INDEX [IX_RecordatorioBateria_Factura]
        ON [dbo].[RecordatorioBateria] ([IdFactura] ASC) WHERE [IdFactura] IS NOT NULL;
GO
