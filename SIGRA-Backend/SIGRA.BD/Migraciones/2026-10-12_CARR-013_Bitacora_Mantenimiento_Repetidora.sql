/*
  SIGRA - Migración 2026-10-12: CARR-013 Bitácora de mantenimiento de repetidoras vinculada a los tickets.
  Ejecutar sobre la base de datos SIGRA (es idempotente: se puede correr varias veces).
  Si usa sqlcmd use: sqlcmd -S servidor -d SIGRA -E -I -f 65001 -i archivo.sql  (-f 65001 = UTF-8, necesario para las tildes; -I = QUOTED_IDENTIFIER ON).
  En SSMS basta con abrir el archivo y ejecutarlo (el archivo ya trae BOM UTF-8).

  Cuando un ticket pasa a estado 'Cerrada', la base de datos agrega sola el detalle del ticket (fecha, técnico
  responsable, tipo de servicio, hallazgos, trabajo realizado y resolución) a la bitácora de cada repetidora del
  ticket. Funciona venga el cierre de donde venga (API, módulo de tickets o SQL), sin registro manual.

  Cambios:
  1. BitacoraEquipo: se agregan TipoServicio, IdTecnico y Resolucion (los registros anteriores no cambian).
  2. Vista vw_BitacoraTicketRepetidora: tickets cerrados con repetidoras, listos para la bitácora.
  3. Triggers trg_Ticket_BitacoraRepetidora (al cerrar el ticket) y trg_Reparacion_BitacoraRepetidora
     (si la reparación/resolución se registra después del cierre, actualiza el detalle).
  4. SP sp_Repetidora_Bitacora (consulta cronológica) y sp_Ticket_Cerrar (cierre de un ticket con su
     formulario: hallazgos, trabajo realizado y resolución; lo puede usar el módulo de tickets).
  5. Se registran en la bitácora los tickets que ya estaban cerrados.
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF COL_LENGTH('dbo.BitacoraEquipo', 'TipoServicio') IS NULL
    ALTER TABLE dbo.BitacoraEquipo ADD TipoServicio VARCHAR(50) NULL;
IF COL_LENGTH('dbo.BitacoraEquipo', 'IdTecnico') IS NULL
    ALTER TABLE dbo.BitacoraEquipo ADD IdTecnico INT NULL
        CONSTRAINT FK_BitacoraEquipo_Tecnico FOREIGN KEY REFERENCES dbo.Usuario (IdUsuario);
IF COL_LENGTH('dbo.BitacoraEquipo', 'Resolucion') IS NULL
    ALTER TABLE dbo.BitacoraEquipo ADD Resolucion VARCHAR(100) NULL;
GO

CREATE OR ALTER VIEW dbo.vw_BitacoraTicketRepetidora
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

GO

CREATE OR ALTER TRIGGER dbo.trg_Ticket_BitacoraRepetidora
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

GO

CREATE OR ALTER TRIGGER dbo.trg_Reparacion_BitacoraRepetidora
ON dbo.Reparacion
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

GO

CREATE OR ALTER PROCEDURE sp_Repetidora_Bitacora
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

GO

CREATE OR ALTER PROCEDURE sp_Ticket_Cerrar
    @IdTicket         INT,
    @IdUsuario        INT,             -- técnico que completa el formulario de cierre
    @Hallazgos        VARCHAR(MAX) = NULL,
    @TrabajoRealizado VARCHAR(MAX) = NULL,
    @Resolucion       VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Estado VARCHAR(30) = (SELECT Estado FROM Ticket WHERE IdTicket = @IdTicket);
    IF @Estado IS NULL
        THROW 50001, 'El ticket indicado no existe.', 1;
    IF @Estado = 'Cerrada'
        THROW 50001, 'El ticket ya se encuentra cerrado.', 1;

    BEGIN TRANSACTION;

    INSERT INTO Reparacion (IdTicket, TecnicoResponsable, Hallazgos, TrabajoRealizado, Resolucion)
    VALUES (@IdTicket, @IdUsuario, @Hallazgos, @TrabajoRealizado, @Resolucion);

    UPDATE TicketEstadoHistorial SET FechaFin = GETDATE() WHERE IdTicket = @IdTicket AND FechaFin IS NULL;
    INSERT INTO TicketEstadoHistorial (IdTicket, IdUsuario, Estado) VALUES (@IdTicket, @IdUsuario, 'Cerrada');

    -- Al cerrarse, el trigger trg_Ticket_BitacoraRepetidora agrega el detalle a la bitácora de cada repetidora del ticket.
    UPDATE Ticket SET Estado = 'Cerrada' WHERE IdTicket = @IdTicket;

    COMMIT TRANSACTION;
END

GO

-- Tickets que ya estaban cerrados antes de esta migración: se agregan a la bitácora (solo los que faltan).
INSERT INTO dbo.BitacoraEquipo (IdEquipo, IdTicket, Fecha, Descripcion, TipoServicio, IdTecnico, Resolucion)
SELECT v.IdEquipo, v.IdTicket, ISNULL(v.FechaCierre, GETDATE()), v.Descripcion, v.TipoServicio, v.IdTecnico, v.Resolucion
FROM dbo.vw_BitacoraTicketRepetidora v
WHERE NOT EXISTS (SELECT 1 FROM dbo.BitacoraEquipo x WHERE x.IdTicket = v.IdTicket AND x.IdEquipo = v.IdEquipo);
GO
