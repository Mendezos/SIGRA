CREATE PROCEDURE sp_Repetidora_Bitacora
    @IdEquipo INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Bitácora de mantenimiento: intervenciones (tickets cerrados) de la repetidora, en orden cronológico.
    SELECT b.IdBitacora, b.Fecha, b.IdTicket, t.CodigoSeguimiento AS CodigoTicket,
           ISNULL(b.TipoServicio, t.TipoServicio) AS TipoServicio,
           u.Nombre AS Tecnico, b.Resolucion, b.Descripcion AS Detalle
    FROM BitacoraEquipo b
    INNER JOIN Ticket t ON t.IdTicket = b.IdTicket
    LEFT JOIN Usuario u ON u.IdUsuario = b.IdTecnico
    WHERE b.IdEquipo = @IdEquipo AND b.IdTicket IS NOT NULL
    ORDER BY b.Fecha ASC, b.IdBitacora ASC;
END
