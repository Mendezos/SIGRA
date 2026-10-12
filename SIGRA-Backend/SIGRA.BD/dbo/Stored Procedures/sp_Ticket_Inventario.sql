CREATE PROCEDURE [dbo].[sp_Ticket_Inventario]
    @IdTicket INT, @IdUsuario INT, @Evento VARCHAR(20), @Resultado NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @@TRANCOUNT=0 THROW 50001, 'El inventario debe actualizarse dentro de la operación de boleta.', 1;
    DECLARE @IdEquipo INT, @Actual VARCHAR(30), @Destino VARCHAR(30), @Anterior VARCHAR(30),
            @Numero BIGINT, @Tipo NVARCHAR(50), @Tecnico NVARCHAR(150), @Nota VARCHAR(MAX), @Fecha DATETIME=GETUTCDATE();
    SELECT @Numero=g.NumeroBoleta,@Tipo=t.TipoServicio,@Tecnico=u.Nombre
    FROM Ticket t INNER JOIN TicketGestion g ON g.IdTicket=t.IdTicket
    LEFT JOIN Usuario u ON u.IdUsuario=COALESCE(g.IdTecnicoCierre,g.IdTecnicoAsignado,@IdUsuario)
    WHERE t.IdTicket=@IdTicket;
    DECLARE equipos CURSOR LOCAL FAST_FORWARD FOR
        SELECT DISTINCT IdEquipo FROM TicketEquipo WHERE IdTicket=@IdTicket AND IdEquipo IS NOT NULL
        UNION
        SELECT IdEquipo FROM TicketInventarioEvento WHERE IdTicket=@IdTicket AND @Evento IN ('Compensar','Sincronizar');
    OPEN equipos; FETCH NEXT FROM equipos INTO @IdEquipo;
    WHILE @@FETCH_STATUS=0
    BEGIN
        SELECT @Actual=Estado FROM Equipo WITH (UPDLOCK,HOLDLOCK) WHERE IdEquipo=@IdEquipo;
        SET @Destino=NULL;
        IF @Evento IN ('Abrir','Sincronizar') AND EXISTS (SELECT 1 FROM TicketEquipo WHERE IdTicket=@IdTicket AND IdEquipo=@IdEquipo)
        BEGIN
            IF @Actual='Dado de baja' THROW 50001, 'Un equipo dado de baja no puede ingresar al taller.', 1;
            IF NOT EXISTS (SELECT 1 FROM TicketInventarioEvento WHERE IdTicket=@IdTicket AND IdEquipo=@IdEquipo)
                INSERT TicketInventarioEvento (IdTicket,IdEquipo,EstadoAnterior) VALUES (@IdTicket,@IdEquipo,@Actual);
            SET @Destino=CASE WHEN EXISTS (SELECT 1 FROM Reparacion WHERE IdTicket=@IdTicket) THEN 'En reparación' ELSE 'En mantenimiento' END;
        END
        ELSE IF @Evento='Cerrar'
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM TicketInventarioEvento WHERE IdTicket=@IdTicket AND IdEquipo=@IdEquipo AND CierreRegistrado=1)
            BEGIN
                SET @Nota=CONCAT('Boleta ',@Numero,' cerrada. Servicio: ',@Tipo,'. Resultado: ',@Resultado,'. Técnico: ',@Tecnico,'.');
                EXEC sp_Bitacora_Registrar @IdEquipo,@IdTicket,@Nota,@Fecha;
                UPDATE TicketInventarioEvento SET CierreRegistrado=1 WHERE IdTicket=@IdTicket AND IdEquipo=@IdEquipo;
            END;
            IF @Resultado IN (N'Reparado',N'Mantenimiento realizado')
                SET @Destino=CASE WHEN EXISTS (SELECT 1 FROM ContratoEquipo ce INNER JOIN Contrato c ON c.IdContrato=ce.IdContrato
                                               WHERE ce.IdEquipo=@IdEquipo AND ce.FechaDevolucion IS NULL AND c.Estado IN ('Activo','Renovado','Vencido')) THEN 'Alquilado' ELSE 'Disponible' END;
            ELSE IF @Resultado=N'Garantía' SET @Destino='En garantía';
        END
        ELSE IF @Evento='Compensar' OR (@Evento='Sincronizar' AND NOT EXISTS (SELECT 1 FROM TicketEquipo WHERE IdTicket=@IdTicket AND IdEquipo=@IdEquipo))
        BEGIN
            SELECT @Anterior=EstadoAnterior FROM TicketInventarioEvento WHERE IdTicket=@IdTicket AND IdEquipo=@IdEquipo;
            SET @Destino=CASE WHEN EXISTS (SELECT 1 FROM ContratoEquipo ce INNER JOIN Contrato c ON c.IdContrato=ce.IdContrato
                                           WHERE ce.IdEquipo=@IdEquipo AND ce.FechaDevolucion IS NULL AND c.Estado IN ('Activo','Renovado','Vencido')) THEN 'Alquilado'
                              ELSE COALESCE(@Anterior,'Disponible') END;
        END;
        IF EXISTS (SELECT 1 FROM TicketEquipo te INNER JOIN Ticket t ON t.IdTicket=te.IdTicket
                   WHERE te.IdEquipo=@IdEquipo AND t.IdTicket<>@IdTicket AND t.Activo=1 AND t.Estado IN ('Creada','Asignada','En proceso'))
            SET @Destino=CASE WHEN EXISTS (SELECT 1 FROM TicketEquipo te INNER JOIN Ticket t ON t.IdTicket=te.IdTicket
                                           INNER JOIN Reparacion r ON r.IdTicket=t.IdTicket
                                           WHERE te.IdEquipo=@IdEquipo AND t.IdTicket<>@IdTicket AND t.Activo=1 AND t.Estado IN ('Creada','Asignada','En proceso'))
                              OR (@Evento IN ('Abrir','Sincronizar') AND EXISTS (SELECT 1 FROM TicketEquipo te INNER JOIN Reparacion r ON r.IdTicket=te.IdTicket WHERE te.IdTicket=@IdTicket AND te.IdEquipo=@IdEquipo))
                              THEN 'En reparación' ELSE 'En mantenimiento' END;
        IF @Destino IS NOT NULL AND @Destino<>@Actual
        BEGIN
            SET @Nota=CONCAT('Boleta ',@Numero,': ',@Evento,'.');
            EXEC sp_Equipo_CambiarEstado @IdEquipo,@Destino,@IdUsuario,'Cambio de estado',@Nota,NULL,@Fecha;
        END;
        FETCH NEXT FROM equipos INTO @IdEquipo;
    END;
    CLOSE equipos; DEALLOCATE equipos;
END;
