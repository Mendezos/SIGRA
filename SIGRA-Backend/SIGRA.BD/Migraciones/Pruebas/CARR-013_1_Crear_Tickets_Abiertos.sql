/*
  PRUEBA CARR-013 (paso 1 de 2) - NO es una migración: solo crea datos de ejemplo para probar la bitácora.
  Crea dos tickets ABIERTOS (un mantenimiento preventivo y una reparación) sobre la repetidora SN-77003.
  Es repetible: si los tickets de prueba ya existen, no los vuelve a crear.
  sqlcmd -S servidor -d SIGRA -E -I -f 65001 -i CARR-013_1_Crear_Tickets_Abiertos.sql
*/
SET QUOTED_IDENTIFIER ON;
GO
DECLARE @IdEquipo INT = (SELECT IdEquipo FROM Equipo WHERE NumeroSerie = 'SN-77003');
DECLARE @IdCliente INT = (SELECT TOP 1 ct.IdCliente FROM ContratoEquipo ce INNER JOIN Contrato ct ON ct.IdContrato = ce.IdContrato WHERE ce.IdEquipo = @IdEquipo ORDER BY ce.IdContratoEquipo DESC);
DECLARE @IdTecnico INT = (SELECT TOP 1 IdUsuario FROM Usuario WHERE Correo = 'ricardo.infante@radifaxcr.com');
IF @IdTecnico IS NULL SET @IdTecnico = (SELECT TOP 1 u.IdUsuario FROM Usuario u INNER JOIN Rol r ON r.IdRol = u.IdRol WHERE r.Nombre IN (N'Tecnico', N'Técnico') ORDER BY u.IdUsuario);

IF @IdEquipo IS NULL OR @IdCliente IS NULL OR @IdTecnico IS NULL
    THROW 50001, 'Faltan datos base: la repetidora SN-77003 con contrato y un usuario técnico.', 1;

DECLARE @Tickets TABLE (Codigo VARCHAR(20), Tipo VARCHAR(50), Problema VARCHAR(MAX), Dias INT);
INSERT INTO @Tickets VALUES
    ('TK-PRUEBA-0001', N'Mantenimiento preventivo', N'Revisión semestral de la repetidora: limpieza, ajuste del duplexor y revisión de la línea de transmisión.', -30),
    ('TK-PRUEBA-0002', N'Reparación', N'La repetidora presenta baja potencia de transmisión y ruido en el canal.', -7);

INSERT INTO Ticket (IdCliente, TecnicoReceptor, CodigoSeguimiento, TipoServicio, Estado, FechaRecepcion, DescripcionProblema)
SELECT @IdCliente, @IdTecnico, t.Codigo, t.Tipo, 'En proceso', DATEADD(DAY, t.Dias, GETDATE()), t.Problema
FROM @Tickets t WHERE NOT EXISTS (SELECT 1 FROM Ticket x WHERE x.CodigoSeguimiento = t.Codigo);

INSERT INTO TicketEquipo (IdTicket, IdEquipo, Problema)
SELECT tk.IdTicket, @IdEquipo, tk.DescripcionProblema
FROM Ticket tk WHERE tk.CodigoSeguimiento IN ('TK-PRUEBA-0001', 'TK-PRUEBA-0002')
  AND NOT EXISTS (SELECT 1 FROM TicketEquipo x WHERE x.IdTicket = tk.IdTicket AND x.IdEquipo = @IdEquipo);

INSERT INTO TicketEstadoHistorial (IdTicket, IdUsuario, Estado, FechaInicio)
SELECT tk.IdTicket, @IdTecnico, 'En proceso', tk.FechaRecepcion
FROM Ticket tk WHERE tk.CodigoSeguimiento IN ('TK-PRUEBA-0001', 'TK-PRUEBA-0002')
  AND NOT EXISTS (SELECT 1 FROM TicketEstadoHistorial x WHERE x.IdTicket = tk.IdTicket);

SELECT tk.CodigoSeguimiento, tk.TipoServicio, tk.Estado FROM Ticket tk WHERE tk.CodigoSeguimiento LIKE 'TK-PRUEBA-%';
GO
