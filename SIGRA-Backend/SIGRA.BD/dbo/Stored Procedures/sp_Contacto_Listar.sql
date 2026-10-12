CREATE PROCEDURE sp_Contacto_Listar
    @IdVendedor INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT c.IdContacto, c.Empresa, c.Contacto, c.MedioContacto, c.DatoContacto, c.Motivo,
           c.IdVendedor, v.Nombre AS Vendedor, c.Estado, c.FechaRegistro, r.Nombre AS RegistradoPor
    FROM ContactoInicial c
    LEFT JOIN Usuario v ON v.IdUsuario = c.IdVendedor
    INNER JOIN Usuario r ON r.IdUsuario = c.IdUsuarioRegistra
    WHERE @IdVendedor IS NULL OR c.IdVendedor = @IdVendedor
    ORDER BY c.FechaRegistro DESC, c.IdContacto DESC;
END
