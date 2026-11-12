-- Cancela un seguimiento (CRMGPSC-018). Conserva la planificación original (FechaHora y FechaHoraOriginal no cambian).
-- Devuelve Aplicado = 1 si se canceló, o 0 si ya estaba cerrado (Completado/Cancelado): no se repite el cierre.
CREATE PROCEDURE [dbo].[sp_CrmSeguimiento_Cancelar]
    @IdSeguimiento INT,
    @Motivo        VARCHAR(500),
    @IdUsuario     INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Estado VARCHAR(15);

    BEGIN TRANSACTION;

    SELECT @Estado = Estado FROM SeguimientoCRM WITH (UPDLOCK, ROWLOCK) WHERE IdSeguimiento = @IdSeguimiento;

    IF @Estado IS NULL
        THROW 50001, N'El seguimiento indicado no existe.', 1;

    IF @Estado IN ('Completado', 'Cancelado')
    BEGIN
        ROLLBACK TRANSACTION;
        SELECT CAST(0 AS BIT) AS Aplicado;
        RETURN;
    END

    UPDATE SeguimientoCRM
    SET Estado = 'Cancelado', MotivoCancelacion = @Motivo, FechaCierre = SYSUTCDATETIME(), IdUsuarioCierre = @IdUsuario
    WHERE IdSeguimiento = @IdSeguimiento;

    INSERT SeguimientoHistorial (IdSeguimiento, Accion, Motivo, IdUsuario)
    VALUES (@IdSeguimiento, 'Cancelado', @Motivo, @IdUsuario);

    COMMIT TRANSACTION;

    SELECT CAST(1 AS BIT) AS Aplicado;
END
