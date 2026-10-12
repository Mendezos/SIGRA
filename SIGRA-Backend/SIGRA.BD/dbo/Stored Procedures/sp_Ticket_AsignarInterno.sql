CREATE PROCEDURE [dbo].[sp_Ticket_AsignarInterno]
    @IdTicket INT, @IdUsuario INT, @IdTecnico INT = NULL,
    @Automatica BIT = 0, @ConfirmarSobrecarga BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    IF @@TRANCOUNT = 0 THROW 50001, 'La asignación requiere una operación transaccional.', 1;
    DECLARE @Limite INT = COALESCE((SELECT CargaMaxima FROM ConfiguracionTickets WHERE Id = 1),5),
            @Anterior INT, @Estado VARCHAR(30), @Numero BIGINT, @Empresa NVARCHAR(150),
            @Servicio NVARCHAR(50), @Fecha DATETIME2 = SYSUTCDATETIME(), @Criterio NVARCHAR(500),
            @Titulo NVARCHAR(200), @Mensaje NVARCHAR(MAX), @Equipos NVARCHAR(MAX), @Plazo NVARCHAR(100);
    SELECT @Anterior = g.IdTecnicoAsignado, @Estado = t.Estado, @Numero = g.NumeroBoleta,
           @Empresa = g.Empresa, @Servicio = t.TipoServicio,
           @Plazo = CASE WHEN g.FechaEstimada IS NOT NULL THEN CONVERT(NVARCHAR(10),DATEADD(HOUR,-6,g.FechaEstimada),103)
                   ELSE CONCAT(COALESCE((SELECT DiasHabilesEstimados FROM ConfiguracionTickets WHERE Id=1),5),N' días hábiles desde la recepción física (pendiente de confirmar)') END
    FROM Ticket t INNER JOIN TicketGestion g ON g.IdTicket=t.IdTicket WHERE t.IdTicket=@IdTicket AND t.Activo=1;
    IF @Estado IS NULL OR @Estado IN ('Cerrada','Cancelada') THROW 50001, 'Esta boleta no admite asignaciones.', 1;
    IF @Estado='En proceso' AND NOT EXISTS (SELECT 1 FROM Reparacion WHERE IdTicket=@IdTicket)
        THROW 50001, 'El mantenimiento solo puede reasignarse antes de iniciar el trabajo.', 1;
    IF @Automatica=1
    BEGIN
        SELECT TOP (1) @IdTecnico = u.IdUsuario
        FROM Usuario u INNER JOIN Rol r ON r.IdRol=u.IdRol
        OUTER APPLY (SELECT COUNT(*) AS Carga FROM TicketGestion g INNER JOIN Ticket t ON t.IdTicket=g.IdTicket
                     WHERE g.IdTecnicoAsignado=u.IdUsuario AND t.Activo=1 AND t.Estado IN ('Asignada','En proceso') AND t.IdTicket<>@IdTicket) carga
        OUTER APPLY (SELECT MAX(a.Fecha) AS Ultima FROM TicketAsignacion a WHERE a.IdTecnico=u.IdUsuario) ultima
        WHERE u.Activo=1 AND r.Activo=1 AND u.IdCliente IS NULL AND r.Nombre COLLATE Latin1_General_100_CI_AI='Tecnico'
          AND carga.Carga < @Limite
          AND NOT EXISTS (SELECT 1 FROM TicketEquipo te WHERE te.IdTicket=@IdTicket
                          AND NOT EXISTS (SELECT 1 FROM UsuarioEspecialidad ue WHERE ue.IdUsuario=u.IdUsuario AND ue.Especialidad=te.Especialidad))
        ORDER BY carga.Carga, ultima.Ultima, u.IdUsuario;
        SET @Criterio=N'Especialidades de todos los equipos, menor carga y mayor tiempo desde la última asignación';
        IF @IdTecnico IS NULL
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM TicketGestion WHERE IdTicket=@IdTicket AND EstadoAsignacion=N'Pendiente de asignación')
            BEGIN
                DECLARE @Coordinador INT;
                DECLARE coordinadores CURSOR LOCAL FAST_FORWARD FOR
                    SELECT u.IdUsuario FROM Usuario u INNER JOIN Rol r ON r.IdRol=u.IdRol
                    WHERE u.Activo=1 AND r.Activo=1 AND u.IdCliente IS NULL
                      AND r.Nombre COLLATE Latin1_General_100_CI_AI IN ('Coordinador tecnico','Administrador del sistema');
                OPEN coordinadores; FETCH NEXT FROM coordinadores INTO @Coordinador;
                SET @Titulo=CONCAT(N'Boleta ',@Numero,N' pendiente de asignación');
                SET @Mensaje=CONCAT(N'Cliente: ',@Empresa,N'. No hay un técnico activo con todas las especialidades necesarias y carga disponible. Revisá la asignación.');
                WHILE @@FETCH_STATUS=0
                BEGIN
                    EXEC sp_Notificacion_Registrar @Coordinador,2,@Titulo,@Mensaje,N'Ticket',@IdTicket;
                    FETCH NEXT FROM coordinadores INTO @Coordinador;
                END;
                CLOSE coordinadores; DEALLOCATE coordinadores;
            END;
            IF @Anterior IS NOT NULL
            BEGIN
                SET @Titulo=CONCAT(N'Boleta ',@Numero,N' pendiente de nueva asignación');
                SET @Mensaje=CONCAT(N'La reparación de ',@Empresa,N' está pendiente de asignación por coordinación. La boleta ya no figura entre tus trabajos asignados.');
                EXEC sp_Notificacion_Registrar @Anterior,2,@Titulo,@Mensaje,N'Ticket',@IdTicket;
            END;
            UPDATE TicketGestion SET EstadoAsignacion=N'Pendiente de asignación',IdTecnicoAsignado=NULL,FechaAsignacion=NULL WHERE IdTicket=@IdTicket;
            UPDATE Reparacion SET TecnicoResponsable=NULL WHERE IdTicket=@IdTicket;
            RETURN;
        END;
    END
    ELSE
    BEGIN
        IF @IdTecnico IS NULL THROW 50001, 'Debe seleccionar un técnico responsable', 1;
        IF NOT EXISTS (SELECT 1 FROM Usuario u INNER JOIN Rol r ON r.IdRol=u.IdRol
                       WHERE u.IdUsuario=@IdTecnico AND u.Activo=1 AND r.Activo=1 AND u.IdCliente IS NULL AND r.Nombre COLLATE Latin1_General_100_CI_AI='Tecnico')
            THROW 50001, 'Seleccione un técnico activo.', 1;
        IF @Anterior=@IdTecnico THROW 50001, 'Este técnico ya es responsable de la boleta.', 1;
        IF @ConfirmarSobrecarga=0 AND (SELECT COUNT(*) FROM TicketGestion g INNER JOIN Ticket t ON t.IdTicket=g.IdTicket
                                      WHERE g.IdTecnicoAsignado=@IdTecnico AND t.Activo=1 AND t.Estado IN ('Asignada','En proceso') AND t.IdTicket<>@IdTicket)>=@Limite
            THROW 50003, 'Este técnico ya alcanzó su carga máxima de boletas abiertas. ¿Desea continuar de todas formas?', 1;
        SET @Criterio=N'Selección manual del coordinador';
    END;
    UPDATE TicketGestion SET IdTecnicoAsignado=@IdTecnico,FechaAsignacion=@Fecha,EstadoAsignacion=N'Asignada' WHERE IdTicket=@IdTicket;
    INSERT TicketAsignacion (IdTicket,IdTecnico,IdUsuario,Automatica,Criterio,Fecha)
    VALUES (@IdTicket,@IdTecnico,@IdUsuario,@Automatica,@Criterio,@Fecha);
    IF EXISTS (SELECT 1 FROM Reparacion WHERE IdTicket=@IdTicket)
        UPDATE Reparacion SET TecnicoResponsable=@IdTecnico WHERE IdTicket=@IdTicket;
    ELSE IF EXISTS (SELECT 1 FROM BoletaMantenimiento WHERE IdTicket=@IdTicket)
        UPDATE BoletaMantenimiento SET TecnicoAsignado=@IdTecnico WHERE IdTicket=@IdTicket;
    ELSE INSERT BoletaMantenimiento (IdTicket,TecnicoAsignado) VALUES (@IdTicket,@IdTecnico);
    IF @Estado='Creada'
    BEGIN
        UPDATE Ticket SET Estado='Asignada' WHERE IdTicket=@IdTicket;
        UPDATE TicketEstadoHistorial SET FechaFin=@Fecha WHERE IdTicket=@IdTicket AND FechaFin IS NULL;
        INSERT TicketEstadoHistorial (IdTicket,IdUsuario,Estado,FechaInicio) VALUES (@IdTicket,@IdUsuario,'Asignada',@Fecha);
    END;
    SELECT @Equipos=STRING_AGG(CONVERT(NVARCHAR(MAX),CONCAT(Marca,N' ',Modelo,N' (',NumeroSerie,N')')),N'; ') FROM TicketEquipo WHERE IdTicket=@IdTicket;
    SET @Titulo=CONCAT(N'Asignación de boleta ',@Numero);
    SET @Mensaje=CONCAT(N'Cliente: ',@Empresa,N'. Servicio: ',@Servicio,N'. Equipos: ',@Equipos,N'. Plazo estimado: ',@Plazo,N'.');
    EXEC sp_Notificacion_Registrar @IdTecnico,2,@Titulo,@Mensaje,N'Ticket',@IdTicket;
    IF @Anterior IS NOT NULL AND @Anterior<>@IdTecnico
    BEGIN
        SET @Titulo=CONCAT(N'Reasignación de boleta ',@Numero);
        SET @Mensaje=CONCAT(N'La boleta de ',@Empresa,N' fue reasignada a otro técnico. Ya no figura entre tus trabajos pendientes.');
        EXEC sp_Notificacion_Registrar @Anterior,2,@Titulo,@Mensaje,N'Ticket',@IdTicket;
    END;
    DECLARE @Auditoria NVARCHAR(MAX)=(SELECT
        JSON_QUERY((SELECT (SELECT Nombre FROM Usuario WHERE IdUsuario=@Anterior) AS tecnico,@Estado AS estado FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)) AS antes,
        JSON_QUERY((SELECT (SELECT Nombre FROM Usuario WHERE IdUsuario=@IdTecnico) AS tecnico,
                    (SELECT Estado FROM Ticket WHERE IdTicket=@IdTicket) AS estado,@Criterio AS criterioAsignacion FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)) AS despues
        FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
    INSERT Auditoria (IdUsuario,Modulo,Entidad,IdEntidad,Accion,Detalle,Fecha)
    VALUES (@IdUsuario,'GTST','Ticket',@IdTicket,'TICKET_ASIGNAR',@Auditoria,@Fecha);
END;
