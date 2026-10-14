CREATE PROCEDURE sp_Solicitud_Otorgar
    @IdSolicitud       INT,
    @FechaOtorgamiento DATE,
    @NumeroResolucion  VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    -- 1) La solicitud pasa a "Otorgada". Solo se puede otorgar una solicitud que sigue "En solicitud".
    UPDATE SolicitudFrecuencia
    SET Estado = 'Otorgada', FechaOtorgamiento = @FechaOtorgamiento, NumeroResolucion = @NumeroResolucion
    WHERE IdSolicitud = @IdSolicitud AND Estado = 'En solicitud';

    IF @@ROWCOUNT = 0
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'Solo se puede registrar el otorgamiento de una solicitud en estado "En solicitud".', 1;
    END

    -- 2) Se activa el ciclo de vigencia: vencimiento = otorgamiento + 5 años y estado "Vigente".
    --    Como es una solicitud nueva, el ciclo de alertas (6 meses, 3 meses y 30 días) empieza de cero.
    UPDATE SolicitudFrecuencia
    SET FechaVencimiento = DATEADD(YEAR, 5, @FechaOtorgamiento), Estado = 'Vigente'
    WHERE IdSolicitud = @IdSolicitud;

    -- 3) Si era una renovación, la frecuencia original queda "Renovada" y conserva su historial.
    UPDATE o
    SET o.Estado = 'Renovada'
    FROM SolicitudFrecuencia o
    INNER JOIN SolicitudFrecuencia r ON r.IdSolicitudOrigen = o.IdSolicitud
    WHERE r.IdSolicitud = @IdSolicitud AND o.Estado IN ('Vigente', 'Por renovar', 'En renovación', 'Vencida');

    COMMIT TRANSACTION;
END
