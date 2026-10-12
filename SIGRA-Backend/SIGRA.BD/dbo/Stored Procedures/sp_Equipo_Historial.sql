CREATE PROCEDURE sp_Equipo_Historial
    @IdEquipo INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT Fecha, Origen, Titulo, Detalle, Usuario
    FROM (
        SELECT mv.Fecha, 'Movimiento' AS Origen, mv.TipoMovimiento AS Titulo,
               CASE WHEN mv.EstadoAnterior IS NULL THEN mv.EstadoNuevo
                    ELSE mv.EstadoAnterior + N' → ' + mv.EstadoNuevo END
               + CASE WHEN mv.Observacion IS NULL THEN '' ELSE '. ' + mv.Observacion END AS Detalle,
               u.Nombre AS Usuario
        FROM MovimientoInventario mv
        INNER JOIN Usuario u ON u.IdUsuario = mv.IdUsuario
        WHERE mv.IdEquipo = @IdEquipo

        UNION ALL

        SELECT b.Fecha, 'Bitácora', 'Bitácora del equipo', b.Descripcion, NULL
        FROM BitacoraEquipo b
        WHERE b.IdEquipo = @IdEquipo

        UNION ALL

        SELECT CAST(ce.FechaAsignacion AS DATETIME), 'Contrato',
               'Asignado al contrato #' + CAST(ce.IdContrato AS VARCHAR(10)),
               cl.Empresa + ' (' + ct.Estado + ')', NULL
        FROM ContratoEquipo ce
        INNER JOIN Contrato ct ON ct.IdContrato = ce.IdContrato
        INNER JOIN Cliente cl ON cl.IdCliente = ct.IdCliente
        WHERE ce.IdEquipo = @IdEquipo

        UNION ALL

        SELECT t.FechaRecepcion, 'Ticket', 'Boleta ' + t.CodigoSeguimiento,
               t.TipoServicio + ' (' + t.Estado + ')', NULL
        FROM TicketEquipo te
        INNER JOIN Ticket t ON t.IdTicket = te.IdTicket
        WHERE te.IdEquipo = @IdEquipo
    ) h
    ORDER BY Fecha DESC;
END
