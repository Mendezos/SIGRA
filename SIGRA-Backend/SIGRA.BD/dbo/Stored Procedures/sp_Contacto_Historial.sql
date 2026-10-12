CREATE PROCEDURE sp_Contacto_Historial
    @IdContacto INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT h.Fecha, u.Nombre AS Usuario, va.Nombre AS VendedorAnterior, vn.Nombre AS VendedorNuevo, h.Motivo
    FROM ContactoHistorial h
    INNER JOIN Usuario u ON u.IdUsuario = h.IdUsuario
    LEFT JOIN Usuario va ON va.IdUsuario = h.IdVendedorAnterior
    INNER JOIN Usuario vn ON vn.IdUsuario = h.IdVendedorNuevo
    WHERE h.IdContacto = @IdContacto
    ORDER BY h.Fecha DESC, h.IdHistorial DESC;
END
