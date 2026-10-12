CREATE PROCEDURE sp_Equipo_Bitacora
    @IdEquipo INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT b.IdBitacora, b.Fecha, b.Descripcion, b.IdTicket, t.CodigoSeguimiento
    FROM BitacoraEquipo b
    LEFT JOIN Ticket t ON t.IdTicket = b.IdTicket
    WHERE b.IdEquipo = @IdEquipo
    ORDER BY b.Fecha DESC, b.IdBitacora DESC;
END
