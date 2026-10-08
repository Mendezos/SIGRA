CREATE PROCEDURE sp_Contacto_RecienteDeEmpresa
    @Empresa VARCHAR(150)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1 c.IdContacto, c.Empresa, c.FechaRegistro, v.Nombre AS Vendedor
    FROM ContactoInicial c
    LEFT JOIN Usuario v ON v.IdUsuario = c.IdVendedor
    WHERE c.Empresa = @Empresa AND c.FechaRegistro >= DATEADD(HOUR, -24, GETDATE())
    ORDER BY c.FechaRegistro DESC;
END
