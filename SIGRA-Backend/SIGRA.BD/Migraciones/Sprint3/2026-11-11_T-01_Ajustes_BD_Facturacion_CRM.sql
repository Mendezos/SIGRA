/*
  SIGRA - Migración Sprint 3 / T-01: ajustes de la base de datos para facturación y CRM.
  Es idempotente: se puede ejecutar varias veces. Normalmente la ejecuta Sincronizar-BD.cjs, después de crear las
  tablas nuevas y agregar las columnas nuevas (que salen de los archivos de dbo/Tables).
  Si se usa sqlcmd: sqlcmd -S servidor -d SIGRA -E -I -f 65001 -i archivo.sql

  Qué hace esta migración (lo que Sincronizar-BD.cjs no puede deducir de los archivos de tablas):
  1. Llaves foráneas de las columnas nuevas de las tablas que ya existían (Prospecto, Cliente, Cotizacion, InteraccionCRM, Contrato).
  2. Índices de esas tablas (incluido el índice único de Notificacion.ClaveUnica, que evita avisos duplicados).
  3. Cotizacion: el estado por defecto pasa de 'Pendiente' a 'Borrador' y se normalizan las filas viejas.
  4. Cliente.IdVendedor se completa con el vendedor del contrato más reciente (solo donde está vacío).
  5. Cotizacion/InteraccionCRM: el prospecto deja de ser obligatorio (puede ser prospecto o cliente).
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;
GO

-- ---------- 1) Prospecto / Cotizacion / InteraccionCRM: la empresa puede ser un prospecto o un cliente ----------
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Cotizacion') AND name = 'IdProspecto' AND is_nullable = 0)
    ALTER TABLE dbo.Cotizacion ALTER COLUMN IdProspecto INT NULL;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InteraccionCRM') AND name = 'IdProspecto' AND is_nullable = 0)
    ALTER TABLE dbo.InteraccionCRM ALTER COLUMN IdProspecto INT NULL;
GO

-- ---------- 2) Cotizacion: estado por defecto 'Borrador' ----------
UPDATE dbo.Cotizacion SET Estado = 'Borrador' WHERE Estado = 'Pendiente';
GO
DECLARE @DefCot SYSNAME = (
    SELECT dc.name FROM sys.default_constraints dc
    INNER JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = OBJECT_ID('dbo.Cotizacion') AND c.name = 'Estado');
IF @DefCot IS NOT NULL AND (SELECT definition FROM sys.default_constraints WHERE name = @DefCot) NOT LIKE '%Borrador%'
BEGIN
    DECLARE @Sql NVARCHAR(400) = N'ALTER TABLE dbo.Cotizacion DROP CONSTRAINT ' + QUOTENAME(@DefCot);
    EXEC (@Sql);
    SET @DefCot = NULL;
END
IF @DefCot IS NULL AND NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_Cotizacion_Estado')
    ALTER TABLE dbo.Cotizacion ADD CONSTRAINT DF_Cotizacion_Estado DEFAULT ('Borrador') FOR Estado;
GO

-- ---------- 3) Llaves foráneas de las columnas nuevas en tablas existentes ----------
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Prospecto_Vendedor')
    ALTER TABLE dbo.Prospecto ADD CONSTRAINT FK_Prospecto_Vendedor FOREIGN KEY (IdVendedor) REFERENCES dbo.Usuario (IdUsuario);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Prospecto_Cliente')
    ALTER TABLE dbo.Prospecto ADD CONSTRAINT FK_Prospecto_Cliente FOREIGN KEY (IdCliente) REFERENCES dbo.Cliente (IdCliente);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Prospecto_UsuarioCrea')
    ALTER TABLE dbo.Prospecto ADD CONSTRAINT FK_Prospecto_UsuarioCrea FOREIGN KEY (IdUsuarioCrea) REFERENCES dbo.Usuario (IdUsuario);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Cliente_Vendedor')
    ALTER TABLE dbo.Cliente ADD CONSTRAINT FK_Cliente_Vendedor FOREIGN KEY (IdVendedor) REFERENCES dbo.Usuario (IdUsuario);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Cliente_UsuarioInactiva')
    ALTER TABLE dbo.Cliente ADD CONSTRAINT FK_Cliente_UsuarioInactiva FOREIGN KEY (IdUsuarioInactiva) REFERENCES dbo.Usuario (IdUsuario);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Cotizacion_Cliente')
    ALTER TABLE dbo.Cotizacion ADD CONSTRAINT FK_Cotizacion_Cliente FOREIGN KEY (IdCliente) REFERENCES dbo.Cliente (IdCliente);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Cotizacion_Vendedor')
    ALTER TABLE dbo.Cotizacion ADD CONSTRAINT FK_Cotizacion_Vendedor FOREIGN KEY (IdVendedor) REFERENCES dbo.Usuario (IdUsuario);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Cotizacion_Origen')
    ALTER TABLE dbo.Cotizacion ADD CONSTRAINT FK_Cotizacion_Origen FOREIGN KEY (IdCotizacionOrigen) REFERENCES dbo.Cotizacion (IdCotizacion);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Cotizacion_UsuarioCrea')
    ALTER TABLE dbo.Cotizacion ADD CONSTRAINT FK_Cotizacion_UsuarioCrea FOREIGN KEY (IdUsuarioCrea) REFERENCES dbo.Usuario (IdUsuario);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InteraccionCRM_Cliente')
    ALTER TABLE dbo.InteraccionCRM ADD CONSTRAINT FK_InteraccionCRM_Cliente FOREIGN KEY (IdCliente) REFERENCES dbo.Cliente (IdCliente);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InteraccionCRM_Contacto')
    ALTER TABLE dbo.InteraccionCRM ADD CONSTRAINT FK_InteraccionCRM_Contacto FOREIGN KEY (IdContactoEmpresa) REFERENCES dbo.ContactoEmpresa (IdContactoEmpresa);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InteraccionCRM_Cotizacion')
    ALTER TABLE dbo.InteraccionCRM ADD CONSTRAINT FK_InteraccionCRM_Cotizacion FOREIGN KEY (IdCotizacion) REFERENCES dbo.Cotizacion (IdCotizacion);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Contrato_Plantilla')
    ALTER TABLE dbo.Contrato ADD CONSTRAINT FK_Contrato_Plantilla FOREIGN KEY (IdPlantilla) REFERENCES dbo.PlantillaContrato (IdPlantilla);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Contrato_UsuarioActiva')
    ALTER TABLE dbo.Contrato ADD CONSTRAINT FK_Contrato_UsuarioActiva FOREIGN KEY (IdUsuarioActiva) REFERENCES dbo.Usuario (IdUsuario);
GO

-- ---------- 4) Índices de las tablas existentes ----------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Prospecto_Estado' AND object_id = OBJECT_ID('dbo.Prospecto'))
    CREATE NONCLUSTERED INDEX IX_Prospecto_Estado ON dbo.Prospecto (Estado ASC, IdVendedor ASC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Prospecto_Empresa' AND object_id = OBJECT_ID('dbo.Prospecto'))
    CREATE NONCLUSTERED INDEX IX_Prospecto_Empresa ON dbo.Prospecto (Empresa ASC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Cotizacion_IdCliente' AND object_id = OBJECT_ID('dbo.Cotizacion'))
    CREATE NONCLUSTERED INDEX IX_Cotizacion_IdCliente ON dbo.Cotizacion (IdCliente ASC) WHERE IdCliente IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InteraccionCRM_IdCliente' AND object_id = OBJECT_ID('dbo.InteraccionCRM'))
    CREATE NONCLUSTERED INDEX IX_InteraccionCRM_IdCliente ON dbo.InteraccionCRM (IdCliente ASC) WHERE IdCliente IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InteraccionCRM_Fecha' AND object_id = OBJECT_ID('dbo.InteraccionCRM'))
    CREATE NONCLUSTERED INDEX IX_InteraccionCRM_Fecha ON dbo.InteraccionCRM (Fecha DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Contrato_Plantilla' AND object_id = OBJECT_ID('dbo.Contrato'))
    CREATE NONCLUSTERED INDEX IX_Contrato_Plantilla ON dbo.Contrato (IdPlantilla ASC) WHERE IdPlantilla IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Notificacion_ClaveUnica' AND object_id = OBJECT_ID('dbo.Notificacion'))
    CREATE UNIQUE NONCLUSTERED INDEX UX_Notificacion_ClaveUnica ON dbo.Notificacion (IdUsuario ASC, ClaveUnica ASC) WHERE ClaveUnica IS NOT NULL;
GO

-- ---------- 5) Cliente.IdVendedor: el vendedor del contrato más reciente (solo donde está vacío) ----------
UPDATE c
SET IdVendedor = x.IdVendedor
FROM dbo.Cliente c
CROSS APPLY (
    SELECT TOP (1) ct.IdVendedor
    FROM dbo.Contrato ct
    WHERE ct.IdCliente = c.IdCliente AND ct.IdVendedor IS NOT NULL
    ORDER BY ct.FechaInicio DESC, ct.IdContrato DESC
) x
WHERE c.IdVendedor IS NULL;
GO
