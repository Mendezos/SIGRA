CREATE PROCEDURE sp_Cliente_Listar
AS
BEGIN
    SET NOCOUNT ON;

    SELECT IdCliente, Empresa, Contacto, Correo, Telefono
    FROM Cliente
    WHERE Activo = 1
    ORDER BY Empresa;
END
