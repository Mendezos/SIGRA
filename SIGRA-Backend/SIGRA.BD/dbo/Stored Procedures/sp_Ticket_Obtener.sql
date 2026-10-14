CREATE PROCEDURE [dbo].[sp_Ticket_Obtener] @IdTicket INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM vw_TicketDetalle WHERE IdTicket = @IdTicket;
    SELECT te.IdTicketEquipo, te.IdEquipo, COALESCE(te.Marca, m.Marca) AS Marca,
           COALESCE(te.Modelo, m.Modelo) AS Modelo, COALESCE(te.Tipo, N'Portátil') AS Tipo,
           COALESCE(te.Especialidad, N'Radios') AS Especialidad,
           COALESCE(te.NumeroSerie, e.NumeroSerie) AS NumeroSerie,
           te.Accesorios AS AccesoriosJson, te.Problema, te.IdContrato, te.CubiertoPorContrato
    FROM TicketEquipo te LEFT JOIN Equipo e ON e.IdEquipo = te.IdEquipo
    LEFT JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    WHERE te.IdTicket = @IdTicket ORDER BY te.IdTicketEquipo;
    SELECT h.Estado, u.Nombre AS Usuario, TODATETIMEOFFSET(h.FechaInicio, '+00:00') AS Fecha
    FROM TicketEstadoHistorial h INNER JOIN Usuario u ON u.IdUsuario = h.IdUsuario
    WHERE h.IdTicket = @IdTicket ORDER BY h.IdHistorial;
    SELECT tecnico.Nombre AS Tecnico, u.Nombre AS Usuario, a.Automatica, a.Criterio,
           TODATETIMEOFFSET(a.Fecha, '+00:00') AS Fecha
    FROM TicketAsignacion a INNER JOIN Usuario tecnico ON tecnico.IdUsuario = a.IdTecnico
    INNER JOIN Usuario u ON u.IdUsuario = a.IdUsuario
    WHERE a.IdTicket = @IdTicket ORDER BY a.IdAsignacion;
    SELECT u.Nombre AS Usuario, TODATETIMEOFFSET(e.Fecha, '+00:00') AS Fecha, e.Resumen
    FROM TicketEdicion e INNER JOIN Usuario u ON u.IdUsuario = e.IdUsuario
    WHERE e.IdTicket = @IdTicket ORDER BY e.IdEdicion DESC;
END;
