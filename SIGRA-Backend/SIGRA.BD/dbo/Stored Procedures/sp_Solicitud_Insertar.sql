CREATE PROCEDURE sp_Solicitud_Insertar
    @IdCliente         INT,
    @IdEquipo          INT,
    @IdVendedor        INT,
    @Frecuencia        VARCHAR(30),
    @Banda             VARCHAR(30),
    @Potencia          VARCHAR(30),
    @ZonaCobertura     VARCHAR(200),
    @FechaPresentacion DATE,
    @IdSolicitudOrigen INT = NULL   -- frecuencia que se está renovando
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IdSolicitud INT, @EstadoOrigen VARCHAR(30);

    BEGIN TRANSACTION;

    -- Evita registrar dos veces el mismo trámite (misma repetidora y frecuencia) mientras sigue en solicitud.
    IF EXISTS (SELECT 1 FROM SolicitudFrecuencia WITH (UPDLOCK, HOLDLOCK)
               WHERE IdEquipo = @IdEquipo AND Frecuencia = @Frecuencia AND Estado = 'En solicitud')
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'Ya existe una solicitud en trámite para esa repetidora con la misma frecuencia.', 1;
    END

    IF @IdSolicitudOrigen IS NOT NULL
    BEGIN
        SELECT @EstadoOrigen = Estado FROM SolicitudFrecuencia WITH (UPDLOCK, HOLDLOCK) WHERE IdSolicitud = @IdSolicitudOrigen;

        IF @EstadoOrigen = 'Cancelada'
        BEGIN
            ROLLBACK TRANSACTION;
            THROW 50001, N'No es posible renovar una frecuencia cancelada', 1;
        END

        -- Una frecuencia solo puede tener una renovación en trámite (las canceladas no cuentan).
        IF EXISTS (SELECT 1 FROM SolicitudFrecuencia WITH (UPDLOCK, HOLDLOCK)
                   WHERE IdSolicitudOrigen = @IdSolicitudOrigen AND Estado <> 'Cancelada')
        BEGIN
            ROLLBACK TRANSACTION;
            THROW 50001, N'La frecuencia ya tiene una renovación iniciada.', 1;
        END
    END

    -- El ID es correlativo (IDENTITY) y el estado inicial lo asigna el valor por defecto: "En solicitud".
    INSERT INTO SolicitudFrecuencia (IdCliente, IdEquipo, IdUsuario, Frecuencia, Banda, Potencia, ZonaCobertura, FechaPresentacion, IdSolicitudOrigen)
    VALUES (@IdCliente, @IdEquipo, @IdVendedor, @Frecuencia, @Banda, @Potencia, @ZonaCobertura, @FechaPresentacion, @IdSolicitudOrigen);
    SET @IdSolicitud = SCOPE_IDENTITY();

    -- La frecuencia original queda "En renovación" (una frecuencia ya vencida conserva su estado "Vencida").
    IF @IdSolicitudOrigen IS NOT NULL
        UPDATE SolicitudFrecuencia SET Estado = 'En renovación'
        WHERE IdSolicitud = @IdSolicitudOrigen AND Estado IN ('Vigente', 'Por renovar');

    COMMIT TRANSACTION;

    SELECT @IdSolicitud;
END
