CREATE PROCEDURE sp_Proveedor_Listar
AS
BEGIN
    SET NOCOUNT ON;

    SELECT IdProveedor, Nombre, Contacto, Correo, Telefono
    FROM Proveedor
    ORDER BY Nombre;
END
