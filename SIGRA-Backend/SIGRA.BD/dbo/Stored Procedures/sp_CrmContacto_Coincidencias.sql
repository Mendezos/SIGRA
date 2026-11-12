-- CRMGPSC-005/006: contactos de la MISMA empresa que tienen el mismo correo (sin distinguir mayúsculas) o el mismo teléfono (solo dígitos).
-- Incluye a los inactivos. Los parámetros en NULL no se comparan. @ExcluirContacto deja fuera al propio contacto al editarlo.
CREATE PROCEDURE [dbo].[sp_CrmContacto_Coincidencias]
    @Tipo              VARCHAR(10),
    @IdEmpresa         INT,
    @Correo            VARCHAR(150) = NULL,
    @Telefono          VARCHAR(20)  = NULL,
    @ExcluirContacto   INT          = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Mail    VARCHAR(150) = NULLIF(LTRIM(RTRIM(@Correo)), '');
    DECLARE @Digitos VARCHAR(20)  = NULLIF(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(@Telefono, ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), CHAR(9), ''), '');

    SELECT d.IdContactoEmpresa, d.Nombre, d.Cargo, d.Telefono, d.Correo, d.Activo, d.EsPrincipal,
           STUFF(CASE WHEN d.PorCorreo = 1 THEN ', mismo correo' ELSE '' END + CASE WHEN d.PorTelefono = 1 THEN ', mismo teléfono' ELSE '' END, 1, 2, '') AS MotivoCoincidencia
    FROM (
        SELECT ce.IdContactoEmpresa, ce.Nombre, ce.Cargo, ce.Telefono, ce.Correo, ce.Activo, ce.EsPrincipal,
               CAST(CASE WHEN @Mail IS NOT NULL AND LTRIM(RTRIM(ce.Correo)) COLLATE Latin1_General_CI_AI = @Mail COLLATE Latin1_General_CI_AI THEN 1 ELSE 0 END AS BIT) AS PorCorreo,
               CAST(CASE WHEN @Digitos IS NOT NULL AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(ce.Telefono, ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), CHAR(9), '') = @Digitos THEN 1 ELSE 0 END AS BIT) AS PorTelefono
        FROM ContactoEmpresa ce
        WHERE ((@Tipo = 'Prospecto' AND ce.IdProspecto = @IdEmpresa) OR (@Tipo = 'Cliente' AND ce.IdCliente = @IdEmpresa))
          AND (@ExcluirContacto IS NULL OR ce.IdContactoEmpresa <> @ExcluirContacto)
    ) d
    WHERE d.PorCorreo = 1 OR d.PorTelefono = 1
    ORDER BY d.IdContactoEmpresa;
END
