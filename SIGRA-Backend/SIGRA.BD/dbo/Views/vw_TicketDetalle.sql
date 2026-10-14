CREATE VIEW [dbo].[vw_TicketDetalle]
AS
SELECT t.IdTicket, g.NumeroBoleta, t.CodigoSeguimiento, t.IdCliente,
       g.Empresa, g.Contacto, g.Telefono, g.Cargo, g.Correo, t.TipoServicio,
       t.Estado, t.Activo, g.IdUsuarioRegistro, registro.Nombre AS RegistradoPor,
       t.TecnicoReceptor, receptor.Nombre AS RecibidoPor, g.IdTecnicoAsignado,
       tecnico.Nombre AS Tecnico,
       CAST(CASE WHEN EXISTS (SELECT 1 FROM Reparacion r WHERE r.IdTicket = t.IdTicket) THEN 1 ELSE 0 END AS BIT) AS EsReparacion,
       g.EstadoAsignacion, g.FacturaEmitida,
       TODATETIMEOFFSET(t.FechaRecepcion, '+00:00') AS FechaRecepcion,
       TODATETIMEOFFSET(g.FechaRecepcionFisica, '+00:00') AS FechaRecepcionFisica,
       TODATETIMEOFFSET(g.FechaAsignacion, '+00:00') AS FechaAsignacion,
       TODATETIMEOFFSET(g.FechaInicio, '+00:00') AS FechaInicio,
       TODATETIMEOFFSET(g.FechaCierre, '+00:00') AS FechaCierre,
       TODATETIMEOFFSET(g.FechaEstimada, '+00:00') AS FechaEstimada,
       g.Motivo, g.TrabajoJson, g.ComprobanteOriginal, g.Version AS VersionBytes,
       COALESCE((SELECT SUM(CAST(DATEDIFF_BIG(SECOND, e.Inicio, COALESCE(e.Fin, SYSUTCDATETIME())) AS FLOAT)) / 3600.0
                 FROM TicketEsperaRepuesto e WHERE e.IdTicket = t.IdTicket), 0.0) AS HorasEspera
FROM Ticket t
INNER JOIN TicketGestion g ON g.IdTicket = t.IdTicket
LEFT JOIN Usuario registro ON registro.IdUsuario = g.IdUsuarioRegistro
LEFT JOIN Usuario receptor ON receptor.IdUsuario = t.TecnicoReceptor
LEFT JOIN Usuario tecnico ON tecnico.IdUsuario = g.IdTecnicoAsignado;
