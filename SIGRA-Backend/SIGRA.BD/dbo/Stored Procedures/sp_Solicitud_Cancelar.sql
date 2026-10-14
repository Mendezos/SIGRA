CREATE PROCEDURE sp_Solicitud_Cancelar
    @IdSolicitud INT,
    @Motivo      VARCHAR(500),
    @IdUsuario   INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Estado VARCHAR(30), @Origen INT, @Hoy DATE = CAST(GETDATE() AS DATE);

    BEGIN TRANSACTION;

    SELECT @Estado = Estado, @Origen = IdSolicitudOrigen
    FROM SolicitudFrecuencia WITH (UPDLOCK, HOLDLOCK)
    WHERE IdSolicitud = @IdSolicitud;

    IF @Estado IS NULL
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'La solicitud indicada no existe.', 1;
    END

    IF @Estado = 'Cancelada'
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'La solicitud ya está cancelada.', 1;
    END

    IF @Estado = 'Renovada'
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'No se puede cancelar una frecuencia que ya fue renovada.', 1;
    END

    IF EXISTS (SELECT 1 FROM SolicitudFrecuencia WHERE IdSolicitudOrigen = @IdSolicitud AND Estado <> 'Cancelada')
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'No se puede cancelar una frecuencia que tiene una renovación en trámite. Cancele primero la renovación.', 1;
    END

    -- 1) La solicitud pasa a "Cancelada" con su motivo y fecha.
    UPDATE SolicitudFrecuencia
    SET Estado = 'Cancelada', FechaCancelacion = GETDATE(), MotivoCancelacion = @Motivo, IdUsuarioCancelacion = @IdUsuario
    WHERE IdSolicitud = @IdSolicitud;

    -- 2) Se detienen las alertas de vencimiento: las pendientes se cierran y ya no se envían por correo.
    UPDATE AlertaFrecuencia
    SET Atendida = 1, FechaAtencion = GETDATE(), IdUsuarioAtencion = @IdUsuario,
        NotaAtencion = LEFT(N'Alerta cerrada automáticamente: la solicitud fue cancelada. Motivo: ' + @Motivo, 1000)
    WHERE IdSolicitud = @IdSolicitud AND Atendida = 0;

    -- 3) Si era una renovación en trámite, la frecuencia original retoma su ciclo normal (y sus alertas).
    IF @Origen IS NOT NULL
        UPDATE o
        SET o.Estado = CASE WHEN o.FechaVencimiento <= @Hoy THEN 'Vencida'
                            WHEN DATEADD(MONTH, -6, o.FechaVencimiento) <= @Hoy THEN 'Por renovar'
                            ELSE 'Vigente' END
        FROM SolicitudFrecuencia o
        WHERE o.IdSolicitud = @Origen AND o.Estado = 'En renovación';

    COMMIT TRANSACTION;
END
