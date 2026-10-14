/*
  PRUEBA CARR-013 (paso 2 de 2) - NO es una migración: simula el formulario de cierre de los tickets de prueba.
  Cierra los tickets TK-PRUEBA-0001 y TK-PRUEBA-0002 con sp_Ticket_Cerrar. Al cerrarse, el sistema agrega solo el
  detalle de cada ticket a la bitácora de mantenimiento de la repetidora SN-77003 (sin registro manual).
  Requiere haber ejecutado el paso 1. Si un ticket ya estaba cerrado se omite.
  sqlcmd -S servidor -d SIGRA -E -I -f 65001 -i CARR-013_2_Cerrar_Tickets.sql
*/
SET QUOTED_IDENTIFIER ON;
GO
DECLARE @Ricardo INT = (SELECT TOP 1 IdUsuario FROM Usuario WHERE Correo = 'ricardo.infante@radifaxcr.com');
DECLARE @Coordinador INT = (SELECT TOP 1 IdUsuario FROM Usuario WHERE Correo = 'mariafernanda.ceciliano@radifaxcr.com');
IF @Ricardo IS NULL SET @Ricardo = (SELECT TOP 1 IdUsuario FROM Usuario ORDER BY IdUsuario);
IF @Coordinador IS NULL SET @Coordinador = @Ricardo;

DECLARE @Id1 INT = (SELECT IdTicket FROM Ticket WHERE CodigoSeguimiento = 'TK-PRUEBA-0001' AND Estado <> 'Cerrada');
DECLARE @Id2 INT = (SELECT IdTicket FROM Ticket WHERE CodigoSeguimiento = 'TK-PRUEBA-0002' AND Estado <> 'Cerrada');

IF @Id1 IS NOT NULL
    EXEC sp_Ticket_Cerrar @IdTicket = @Id1, @IdUsuario = @Ricardo,
        @Hallazgos = N'Duplexor desajustado y conectores con oxidación leve.',
        @TrabajoRealizado = N'Limpieza general, reajuste del duplexor y cambio de conectores N.',
        @Resolucion = N'Mantenimiento completado';

IF @Id2 IS NOT NULL
    EXEC sp_Ticket_Cerrar @IdTicket = @Id2, @IdUsuario = @Coordinador,
        @Hallazgos = N'Amplificador de potencia con falla parcial.',
        @TrabajoRealizado = N'Reemplazo del módulo amplificador y calibración de potencia a 40 W.',
        @Resolucion = N'Reparado';

SELECT b.Fecha, t.CodigoSeguimiento, b.TipoServicio, u.Nombre AS Tecnico, b.Resolucion
FROM BitacoraEquipo b INNER JOIN Ticket t ON t.IdTicket = b.IdTicket LEFT JOIN Usuario u ON u.IdUsuario = b.IdTecnico
WHERE t.CodigoSeguimiento LIKE 'TK-PRUEBA-%' ORDER BY b.Fecha;
GO
