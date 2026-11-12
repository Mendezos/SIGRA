-- Repuestos de bodega con existencias, para que el técnico elija cuál usó.
CREATE PROCEDURE sp_TicketRepuesto_Catalogo
AS
BEGIN
    SET NOCOUNT ON;

    SELECT r.IdRepuesto AS Id, r.IdModelo, m.Marca + N' ' + m.Modelo AS Modelo, r.Nombre, r.Cantidad
    FROM Repuesto r
    INNER JOIN ModeloEquipo m ON m.IdModelo = r.IdModelo
    WHERE r.Cantidad > 0
    ORDER BY m.Marca, m.Modelo, r.Nombre;
END
