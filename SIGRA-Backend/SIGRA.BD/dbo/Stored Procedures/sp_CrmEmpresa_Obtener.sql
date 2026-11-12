-- Datos básicos de una empresa del CRM (prospecto o cliente). Sin filas = la empresa no existe.
-- Sirve para validar, antes de registrar contactos, notas, interacciones o seguimientos, que la empresa exista y esté activa.
CREATE PROCEDURE [dbo].[sp_CrmEmpresa_Obtener]
    @Tipo      VARCHAR(10),
    @IdEmpresa INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @Tipo = 'Prospecto'
        SELECT 'Prospecto' AS Tipo, p.IdProspecto AS IdEmpresa, p.Empresa, p.Estado, p.IdVendedor,
               CAST(CASE WHEN p.Estado IN ('Convertido', 'Descartado') THEN 0 ELSE 1 END AS BIT) AS Activa
        FROM Prospecto p WHERE p.IdProspecto = @IdEmpresa;
    ELSE IF @Tipo = 'Cliente'
        SELECT 'Cliente' AS Tipo, c.IdCliente AS IdEmpresa, c.Empresa,
               CASE WHEN c.Activo = 1 THEN 'Activo' ELSE 'Inactivo' END AS Estado, c.IdVendedor, c.Activo AS Activa
        FROM Cliente c WHERE c.IdCliente = @IdEmpresa;
END
