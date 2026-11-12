-- Prospectos y clientes que coinciden con los datos indicados (CRMGPSC-001 y CRMGPSC-003): mismo correo (sin distinguir mayúsculas),
-- mismo teléfono (comparando solo los dígitos) o mismo nombre de empresa (sin tildes, mayúsculas ni espacios de más).
-- Los parámetros en NULL no se comparan. @ExcluirProspecto deja fuera al propio prospecto cuando se está editando.
CREATE PROCEDURE [dbo].[sp_CrmProspecto_Coincidencias]
    @Empresa           VARCHAR(150) = NULL,
    @Correo            VARCHAR(150) = NULL,
    @Telefono          VARCHAR(20)  = NULL,
    @ExcluirProspecto  INT          = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Nombre VARCHAR(150) = NULLIF(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(@Empresa, ' ', '<>'), '><', ''), '<>', ' '))), '');
    DECLARE @Mail   VARCHAR(150) = NULLIF(LTRIM(RTRIM(@Correo)), '');
    DECLARE @Digitos VARCHAR(20) = NULLIF(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(@Telefono, ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), CHAR(9), ''), '');

    ;WITH Empresas AS (
        SELECT 'Prospecto' AS Tipo, p.IdProspecto AS IdEmpresa, p.Empresa, p.Correo, p.Telefono, p.Estado
        FROM Prospecto p
        WHERE @ExcluirProspecto IS NULL OR p.IdProspecto <> @ExcluirProspecto
        UNION ALL
        SELECT 'Cliente', c.IdCliente, c.Empresa, c.Correo, c.Telefono, CASE WHEN c.Activo = 1 THEN 'Activo' ELSE 'Inactivo' END
        FROM Cliente c
    ),
    Datos AS (
        SELECT e.Tipo, e.IdEmpresa, e.Empresa, e.Estado,
               CAST(CASE WHEN @Mail IS NOT NULL AND LTRIM(RTRIM(e.Correo)) COLLATE Latin1_General_CI_AI = @Mail COLLATE Latin1_General_CI_AI THEN 1 ELSE 0 END AS BIT) AS PorCorreo,
               CAST(CASE WHEN @Digitos IS NOT NULL AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(e.Telefono, ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), CHAR(9), '') = @Digitos THEN 1 ELSE 0 END AS BIT) AS PorTelefono,
               CAST(CASE WHEN @Nombre IS NOT NULL AND LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(e.Empresa, ' ', '<>'), '><', ''), '<>', ' '))) COLLATE Latin1_General_CI_AI = @Nombre COLLATE Latin1_General_CI_AI THEN 1 ELSE 0 END AS BIT) AS PorNombre
        FROM Empresas e
    )
    SELECT d.Tipo, d.IdEmpresa, d.Empresa,
           STUFF(CASE WHEN d.PorCorreo = 1 THEN ', mismo correo' ELSE '' END
               + CASE WHEN d.PorTelefono = 1 THEN ', mismo teléfono' ELSE '' END
               + CASE WHEN d.PorNombre = 1 THEN ', mismo nombre de empresa' ELSE '' END, 1, 2, '') AS MotivoCoincidencia,
           d.Estado
    FROM Datos d
    WHERE d.PorCorreo = 1 OR d.PorTelefono = 1 OR d.PorNombre = 1
    ORDER BY d.Tipo DESC, d.IdEmpresa;
END
