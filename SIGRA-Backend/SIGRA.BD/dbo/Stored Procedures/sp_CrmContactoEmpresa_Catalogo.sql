-- Contactos (personas) de una empresa del CRM, para los selectores de interacciones, seguimientos y series.
-- El CRUD completo de contactos vive en sp_CrmContacto_* (CRMGPSC-005 a 007).
CREATE PROCEDURE [dbo].[sp_CrmContactoEmpresa_Catalogo]
    @Tipo        VARCHAR(10),
    @IdEmpresa   INT,
    @SoloActivos BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ce.IdContactoEmpresa, ce.Nombre, ce.Cargo, ce.Telefono, ce.Correo, ce.PreferenciaContacto, ce.EsPrincipal, ce.Activo
    FROM ContactoEmpresa ce
    WHERE ((@Tipo = 'Prospecto' AND ce.IdProspecto = @IdEmpresa) OR (@Tipo = 'Cliente' AND ce.IdCliente = @IdEmpresa))
      AND (@SoloActivos = 0 OR ce.Activo = 1)
    ORDER BY ce.EsPrincipal DESC, ce.Nombre;
END
