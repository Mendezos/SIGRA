-- Repuestos que el técnico ha usado en una boleta.
CREATE PROCEDURE sp_TicketRepuesto_Listar
    @IdTicket INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT tr.IdTicketRepuesto, tr.IdRepuesto, r.Nombre, m.Marca + N' ' + m.Modelo AS Modelo, tr.Cantidad,
           u.Nombre AS Usuario, tr.Fecha
    FROM TicketRepuesto tr
    INNER JOIN Repuesto r ON r.IdRepuesto = tr.IdRepuesto
    INNER JOIN ModeloEquipo m ON m.IdModelo = r.IdModelo
    INNER JOIN Usuario u ON u.IdUsuario = tr.IdUsuario
    WHERE tr.IdTicket = @IdTicket
    ORDER BY tr.Fecha, tr.IdTicketRepuesto;
END
