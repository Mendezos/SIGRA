-- CRMGPSC-021: lista de clientes para entrar a su perfil.
CREATE PROCEDURE [dbo].[sp_CrmCliente_Listar]
    @Texto      VARCHAR(150) = NULL,
    @IdVendedor INT = NULL,
    @Estado     VARCHAR(10) = NULL     -- 'Activo' | 'Inactivo'
AS
BEGIN
    SET NOCOUNT ON;

    SELECT c.IdCliente, c.Empresa, c.Contacto, c.Correo, c.Telefono, c.Sector, c.Activo, c.IdVendedor, v.Nombre AS Vendedor,
           (SELECT COUNT(*) FROM Contrato ct WHERE ct.IdCliente = c.IdCliente AND ct.Estado IN ('Activo', 'Renovado')) AS ContratosVigentes,
           (SELECT COUNT(*) FROM Ticket t WHERE t.IdCliente = c.IdCliente AND t.Activo = 1 AND t.Estado IN ('Creada', 'Asignada', 'En proceso')) AS TicketsAbiertos
    FROM Cliente c
    LEFT JOIN Usuario v ON v.IdUsuario = c.IdVendedor
    WHERE (@Texto IS NULL OR c.Empresa LIKE '%' + @Texto + '%' OR c.Contacto LIKE '%' + @Texto + '%' OR c.Correo LIKE '%' + @Texto + '%')
      AND (@IdVendedor IS NULL OR c.IdVendedor = @IdVendedor)
      AND (@Estado IS NULL OR c.Activo = CASE WHEN @Estado = 'Activo' THEN 1 ELSE 0 END)
    ORDER BY c.Empresa;
END
