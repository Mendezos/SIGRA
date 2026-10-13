CREATE VIEW dbo.vw_BitacoraTicketRepetidora
AS
-- Una fila por cada repetidora incluida en un ticket CERRADO: es lo que se agrega a la bitácora de mantenimiento del equipo.
SELECT t.IdTicket,
       te.IdEquipo,
       t.TipoServicio,
       COALESCE(r.TecnicoResponsable, b.TecnicoAsignado, t.TecnicoReceptor) AS IdTecnico,
       r.Resolucion,
       (SELECT MAX(h.FechaInicio) FROM dbo.TicketEstadoHistorial h WHERE h.IdTicket = t.IdTicket AND h.Estado = 'Cerrada') AS FechaCierre,
       CAST(N'Ticket ' + t.CodigoSeguimiento + N' cerrado (' + t.TipoServicio + N'). Problema reportado: '
            + ISNULL(NULLIF(te.Problema, ''), t.DescripcionProblema)
            + ISNULL(N' Hallazgos: ' + NULLIF(r.Hallazgos, ''), N'')
            + ISNULL(N' Trabajo realizado: ' + NULLIF(r.TrabajoRealizado, ''), N'')
            + ISNULL(N' Resolución: ' + NULLIF(r.Resolucion, ''), N'') AS VARCHAR(MAX)) AS Descripcion
FROM dbo.Ticket t
INNER JOIN dbo.TicketEquipo te ON te.IdTicket = t.IdTicket
INNER JOIN dbo.Equipo e ON e.IdEquipo = te.IdEquipo
INNER JOIN dbo.ModeloEquipo m ON m.IdModelo = e.IdModelo
INNER JOIN dbo.CategoriaEquipo c ON c.IdCategoria = m.IdCategoria AND c.Nombre = N'Repetidora'
OUTER APPLY (SELECT TOP 1 x.TecnicoResponsable, x.Hallazgos, x.TrabajoRealizado, x.Resolucion
             FROM dbo.Reparacion x WHERE x.IdTicket = t.IdTicket ORDER BY x.IdReparacion DESC) r
OUTER APPLY (SELECT TOP 1 y.TecnicoAsignado FROM dbo.BoletaMantenimiento y WHERE y.IdTicket = t.IdTicket ORDER BY y.IdBoleta DESC) b
WHERE t.Estado = 'Cerrada';
