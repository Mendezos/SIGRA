CREATE PROCEDURE sp_Contacto_VendedorPrevio
    @Empresa VARCHAR(150)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1 v.IdUsuario, v.Nombre
    FROM Contrato c
    INNER JOIN Cliente cl ON cl.IdCliente = c.IdCliente
    INNER JOIN (
        SELECT u.IdUsuario, u.Nombre
    FROM Usuario u
    INNER JOIN Rol r ON r.IdRol = u.IdRol
    WHERE r.Nombre = 'Vendedor / Ejecutivo de cuenta' AND u.Activo = 1
    ) v ON v.IdUsuario = c.IdVendedor
    WHERE cl.Empresa = @Empresa
    ORDER BY c.IdContrato DESC;
END
