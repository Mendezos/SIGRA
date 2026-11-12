-- CRMGPSC-005 a 007: un contacto de empresa (sin filas = no existe). Mismas columnas que sp_CrmContacto_Listar.
CREATE PROCEDURE [dbo].[sp_CrmContacto_Obtener]
    @IdContactoEmpresa INT
AS
BEGIN
    SET NOCOUNT ON;

    EXEC sp_CrmContacto_Listar @IdContactoEmpresa = @IdContactoEmpresa;
END
