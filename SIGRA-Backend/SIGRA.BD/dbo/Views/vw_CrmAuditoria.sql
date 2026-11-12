CREATE VIEW dbo.vw_CrmAuditoria
AS
-- CRMGPSC-026: eventos de auditoría del módulo CRM con la empresa (prospecto o cliente) a la que pertenece cada registro afectado
-- y el vendedor responsable de esa empresa. La hora se entrega en hora de Costa Rica (UTC-6).
SELECT a.IdAuditoria,
       a.Entidad,
       a.IdEntidad,
       a.Accion,
       a.Detalle,
       a.IdUsuario AS IdAutor,
       COALESCE(u.Nombre, N'Sistema') AS Autor,
       DATEADD(HOUR, -6, a.Fecha) AS Fecha,
       o.IdProspecto,
       o.IdCliente,
       COALESCE(p.Empresa, cl.Empresa) AS Empresa,
       COALESCE(cl.IdVendedor, p.IdVendedor) AS IdVendedor,
       COALESCE(v.Nombre, N'Sin responsable') AS Vendedor
FROM dbo.Auditoria a
LEFT JOIN dbo.Usuario u ON u.IdUsuario = a.IdUsuario
OUTER APPLY (
    SELECT TOP 1 x.IdProspecto, x.IdCliente
    FROM (
        SELECT IdProspecto, CAST(NULL AS INT) AS IdCliente FROM dbo.Prospecto WHERE a.Entidad = 'Prospecto' AND IdProspecto = a.IdEntidad
        UNION ALL SELECT CAST(NULL AS INT), IdCliente FROM dbo.Cliente WHERE a.Entidad = 'Cliente' AND IdCliente = a.IdEntidad
        UNION ALL SELECT IdProspecto, IdCliente FROM dbo.SeguimientoCRM WHERE a.Entidad = 'Seguimiento' AND IdSeguimiento = a.IdEntidad
        UNION ALL SELECT IdProspecto, IdCliente FROM dbo.SerieContactoCRM WHERE a.Entidad = 'SerieContacto' AND IdSerie = a.IdEntidad
        UNION ALL SELECT IdProspecto, IdCliente FROM dbo.ContactoEmpresa WHERE a.Entidad = 'ContactoEmpresa' AND IdContactoEmpresa = a.IdEntidad
        UNION ALL SELECT IdProspecto, IdCliente FROM dbo.NotaCRM WHERE a.Entidad = 'NotaCRM' AND IdNota = a.IdEntidad
        UNION ALL SELECT IdProspecto, IdCliente FROM dbo.InteraccionCRM WHERE a.Entidad = 'InteraccionCRM' AND IdInteraccion = a.IdEntidad
    ) x
) o
LEFT JOIN dbo.Prospecto p ON p.IdProspecto = o.IdProspecto
LEFT JOIN dbo.Cliente cl ON cl.IdCliente = o.IdCliente
LEFT JOIN dbo.Usuario v ON v.IdUsuario = COALESCE(cl.IdVendedor, p.IdVendedor)
WHERE a.Modulo = 'CRM';
