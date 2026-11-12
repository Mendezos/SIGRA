-- Catálogo de "empresas" del CRM: prospectos y clientes en una sola lista (para los selectores de contactos, notas,
-- interacciones y seguimientos). @Tipo = 'Prospecto' | 'Cliente' | NULL (ambos).
-- @SoloActivas = 1: oculta los prospectos Convertido/Descartado y los clientes inactivos.
CREATE PROCEDURE [dbo].[sp_CrmEmpresa_Listar]
    @Texto       VARCHAR(150) = NULL,
    @Tipo        VARCHAR(10)  = NULL,
    @SoloActivas BIT          = 1
AS
BEGIN
    SET NOCOUNT ON;

    SELECT x.Tipo, x.IdEmpresa, x.Empresa, x.Contacto, x.Correo, x.Telefono, x.IdVendedor, x.Vendedor, x.Estado, x.Activa
    FROM (
        SELECT 'Prospecto' AS Tipo, p.IdProspecto AS IdEmpresa, p.Empresa, p.Contacto, p.Correo, p.Telefono,
               p.IdVendedor, v.Nombre AS Vendedor, p.Estado,
               CAST(CASE WHEN p.Estado IN ('Convertido', 'Descartado') THEN 0 ELSE 1 END AS BIT) AS Activa
        FROM Prospecto p
        LEFT JOIN Usuario v ON v.IdUsuario = p.IdVendedor
        UNION ALL
        SELECT 'Cliente', c.IdCliente, c.Empresa, c.Contacto, c.Correo, c.Telefono,
               c.IdVendedor, v.Nombre, CASE WHEN c.Activo = 1 THEN 'Activo' ELSE 'Inactivo' END, c.Activo
        FROM Cliente c
        LEFT JOIN Usuario v ON v.IdUsuario = c.IdVendedor
    ) x
    WHERE (@Tipo IS NULL OR x.Tipo = @Tipo)
      AND (@SoloActivas = 0 OR x.Activa = 1)
      AND (@Texto IS NULL OR x.Empresa COLLATE Latin1_General_CI_AI LIKE '%' + @Texto + '%')
    ORDER BY x.Empresa, x.Tipo;
END
