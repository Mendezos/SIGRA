-- Registra la atención de un recordatorio de batería (CRMGPSC-025): medio, resultado (obligatorio), observación y próximo paso.
-- El recordatorio queda "Atendido" conservando todo el seguimiento. Solo se puede atender desde Pendiente o Notificado; si ya está
-- Atendido o Cerrado no se modifica nada (no se duplica la atención) y Aplicado = 0.
-- Devuelve una fila con Aplicado (1 = se registró la atención, 0 = ya estaba finalizado).
CREATE PROCEDURE [dbo].[sp_CrmBateria_Atender]
    @IdRecordatorio INT,
    @Medio          VARCHAR(20),
    @Resultado      VARCHAR(500),
    @Observacion    VARCHAR(1000) = NULL,
    @ProximoPaso    VARCHAR(500)  = NULL,
    @IdUsuario      INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @Resultado = NULLIF(LTRIM(RTRIM(@Resultado)), '');
    SET @Observacion = NULLIF(LTRIM(RTRIM(@Observacion)), '');
    SET @ProximoPaso = NULLIF(LTRIM(RTRIM(@ProximoPaso)), '');

    IF @Medio IS NULL OR @Medio NOT IN ('Llamada', 'Correo', 'Visita', 'WhatsApp', 'Otro')
        THROW 50001, N'Debe seleccionar el medio de contacto utilizado.', 1;
    IF @Resultado IS NULL
        THROW 50001, N'Debe registrar el resultado del contacto con el cliente.', 1;

    DECLARE @Estado VARCHAR(15), @Aplicado BIT = 0;

    BEGIN TRANSACTION;

    SELECT @Estado = Estado FROM RecordatorioBateria WITH (UPDLOCK, ROWLOCK) WHERE IdRecordatorio = @IdRecordatorio;
    IF @Estado IS NULL THROW 50001, N'El recordatorio indicado no existe.', 1;

    IF @Estado IN ('Pendiente', 'Notificado')
    BEGIN
        UPDATE RecordatorioBateria
        SET Estado = 'Atendido', FechaAtencion = SYSUTCDATETIME(), MedioAtencion = @Medio, ResultadoAtencion = @Resultado,
            ObservacionAtencion = @Observacion, ProximoPasoAtencion = @ProximoPaso, IdUsuarioAtencion = @IdUsuario
        WHERE IdRecordatorio = @IdRecordatorio;
        SET @Aplicado = 1;
    END;

    COMMIT TRANSACTION;

    SELECT @Aplicado AS Aplicado;
END
