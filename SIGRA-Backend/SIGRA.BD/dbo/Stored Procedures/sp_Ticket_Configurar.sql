CREATE PROCEDURE [dbo].[sp_Ticket_Configurar]
    @Operacion VARCHAR(30), @IdUsuario INT, @Datos NVARCHAR(MAX), @IdTecnico INT = NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        EXEC sp_Ticket_Bloquear;
        IF @Operacion='Configuracion'
        BEGIN
            DECLARE @Carga INT=TRY_CONVERT(INT,JSON_VALUE(@Datos,'$.cargaMaxima')), @Dias INT=TRY_CONVERT(INT,JSON_VALUE(@Datos,'$.diasHabilesEstimados'));
            IF @Carga IS NULL OR @Carga<1 OR @Dias IS NULL OR @Dias<1 THROW 50001, 'La carga y el plazo deben ser mayores a cero.', 1;
            IF EXISTS (SELECT 1 FROM ConfiguracionTickets WHERE Id=1)
                UPDATE ConfiguracionTickets SET CargaMaxima=@Carga,DiasHabilesEstimados=@Dias WHERE Id=1;
            ELSE INSERT ConfiguracionTickets (Id,CargaMaxima,DiasHabilesEstimados) VALUES (1,@Carga,@Dias);
        END
        ELSE IF @Operacion='Especialidades'
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM Usuario u INNER JOIN Rol r ON r.IdRol=u.IdRol
                           WHERE u.IdUsuario=@IdTecnico AND u.Activo=1 AND r.Activo=1 AND r.Nombre COLLATE Latin1_General_100_CI_AI='Tecnico')
                THROW 50001, 'Seleccione un técnico activo.', 1;
            IF EXISTS (SELECT 1 FROM OPENJSON(@Datos) WHERE value NOT IN (N'Radios',N'Repetidoras')) THROW 50001, 'La especialidad no es válida.', 1;
            DELETE UsuarioEspecialidad WHERE IdUsuario=@IdTecnico;
            INSERT UsuarioEspecialidad (IdUsuario,Especialidad) SELECT @IdTecnico,value FROM OPENJSON(@Datos) GROUP BY value;
        END
        ELSE THROW 50001, 'La configuración solicitada no es válida.', 1;
        INSERT Auditoria (IdUsuario,Modulo,Entidad,IdEntidad,Accion,Detalle)
        VALUES (@IdUsuario,'GTST','ConfiguracionTickets',@IdTecnico,'CONFIGURACION_ACTUALIZADA',@Datos);
        DECLARE @IdTicket INT;
        DECLARE pendientes CURSOR LOCAL FAST_FORWARD FOR
            SELECT g.IdTicket FROM TicketGestion g INNER JOIN Ticket t ON t.IdTicket=g.IdTicket
            INNER JOIN Reparacion r ON r.IdTicket=g.IdTicket
            WHERE t.Activo=1 AND t.Estado IN ('Creada','En proceso') AND g.EstadoAsignacion=N'Pendiente de asignación';
        OPEN pendientes; FETCH NEXT FROM pendientes INTO @IdTicket;
        WHILE @@FETCH_STATUS=0
        BEGIN
            EXEC sp_Ticket_AsignarInterno @IdTicket,@IdUsuario,NULL,1;
            FETCH NEXT FROM pendientes INTO @IdTicket;
        END;
        CLOSE pendientes; DEALLOCATE pendientes;
        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        THROW;
    END CATCH;
END;
