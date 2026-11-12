-- CRMGPSC-005 a 007: personas de contacto de los prospectos y clientes. Filtros opcionales (se combinan):
-- empresa (@Tipo + @IdEmpresa), texto (nombre, cargo, correo, teléfono o empresa; sin tildes ni mayúsculas) y estado (@Activo 1 = activos, 0 = inactivos).
-- @IdContactoEmpresa devuelve un solo contacto. FechaCumpleanos es una fecha; FechaDesactivacion viene en UTC.
CREATE PROCEDURE [dbo].[sp_CrmContacto_Listar]
    @Tipo               VARCHAR(10)  = NULL,
    @IdEmpresa          INT          = NULL,
    @Texto              VARCHAR(150) = NULL,
    @Activo             BIT          = NULL,
    @IdContactoEmpresa  INT          = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ce.IdContactoEmpresa,
           CASE WHEN ce.IdProspecto IS NOT NULL THEN 'Prospecto' ELSE 'Cliente' END AS Tipo,
           ISNULL(ce.IdProspecto, ce.IdCliente) AS IdEmpresa,
           ISNULL(p.Empresa, c.Empresa) AS Empresa,
           CASE WHEN ce.IdProspecto IS NOT NULL THEN p.Estado WHEN c.Activo = 1 THEN 'Activo' ELSE 'Inactivo' END AS EstadoEmpresa,
           CAST(CASE WHEN ce.IdProspecto IS NOT NULL THEN CASE WHEN p.Estado IN ('Convertido', 'Descartado') THEN 0 ELSE 1 END
                     ELSE c.Activo END AS BIT) AS EmpresaActiva,
           ce.Nombre, ce.Cargo, ce.Telefono, ce.Correo, ce.FechaCumpleanos, ce.PreferenciaContacto, ce.EsPrincipal, ce.Activo,
           ce.MotivoDesactivacion, TODATETIMEOFFSET(ce.FechaDesactivacion, '+00:00') AS FechaDesactivacion,
           (SELECT COUNT(*) FROM InteraccionCRM i WHERE i.IdContactoEmpresa = ce.IdContactoEmpresa) AS CantidadInteracciones,
           (SELECT COUNT(*) FROM SeguimientoCRM s WHERE s.IdContactoEmpresa = ce.IdContactoEmpresa) AS CantidadSeguimientos
    FROM ContactoEmpresa ce
    LEFT JOIN Prospecto p ON p.IdProspecto = ce.IdProspecto
    LEFT JOIN Cliente c ON c.IdCliente = ce.IdCliente
    WHERE (@IdContactoEmpresa IS NULL OR ce.IdContactoEmpresa = @IdContactoEmpresa)
      AND (@Tipo IS NULL OR (@Tipo = 'Prospecto' AND ce.IdProspecto IS NOT NULL AND (@IdEmpresa IS NULL OR ce.IdProspecto = @IdEmpresa))
                         OR (@Tipo = 'Cliente' AND ce.IdCliente IS NOT NULL AND (@IdEmpresa IS NULL OR ce.IdCliente = @IdEmpresa)))
      AND (@Activo IS NULL OR ce.Activo = @Activo)
      AND (@Texto IS NULL
           OR ce.Nombre COLLATE Latin1_General_CI_AI LIKE '%' + @Texto + '%' COLLATE Latin1_General_CI_AI
           OR ce.Cargo COLLATE Latin1_General_CI_AI LIKE '%' + @Texto + '%' COLLATE Latin1_General_CI_AI
           OR ce.Correo COLLATE Latin1_General_CI_AI LIKE '%' + @Texto + '%' COLLATE Latin1_General_CI_AI
           OR ce.Telefono LIKE '%' + @Texto + '%'
           OR ISNULL(p.Empresa, c.Empresa) COLLATE Latin1_General_CI_AI LIKE '%' + @Texto + '%' COLLATE Latin1_General_CI_AI)
    ORDER BY Empresa, ce.Activo DESC, ce.EsPrincipal DESC, ce.Nombre;
END
