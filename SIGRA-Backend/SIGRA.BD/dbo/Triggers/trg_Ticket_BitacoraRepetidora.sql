CREATE TRIGGER dbo.trg_Ticket_BitacoraRepetidora
ON dbo.Ticket
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Agrega a la bitácora las repetidoras que faltan y refresca el detalle de las que ya estaban.
    INSERT INTO dbo.BitacoraEquipo (IdEquipo, IdTicket, Fecha, Descripcion, TipoServicio, IdTecnico, Resolucion)
    SELECT v.IdEquipo, v.IdTicket, ISNULL(v.FechaCierre, GETDATE()), v.Descripcion, v.TipoServicio, v.IdTecnico, v.Resolucion
    FROM dbo.vw_BitacoraTicketRepetidora v
    WHERE v.IdTicket IN (SELECT IdTicket FROM inserted)
      AND NOT EXISTS (SELECT 1 FROM dbo.BitacoraEquipo x WHERE x.IdTicket = v.IdTicket AND x.IdEquipo = v.IdEquipo);

    UPDATE x
    SET x.Descripcion = v.Descripcion, x.TipoServicio = v.TipoServicio, x.IdTecnico = v.IdTecnico, x.Resolucion = v.Resolucion
    FROM dbo.BitacoraEquipo x
    INNER JOIN dbo.vw_BitacoraTicketRepetidora v ON v.IdTicket = x.IdTicket AND v.IdEquipo = x.IdEquipo
    WHERE x.IdTicket IN (SELECT IdTicket FROM inserted);
END
