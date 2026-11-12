-- Reprograma un seguimiento Pendiente o Atrasado (CRMGPSC-017).
-- La nueva fecha y hora (hora de Costa Rica) deben ser futuras. FechaHoraOriginal no cambia: la fecha anterior queda en el
-- historial (FechaHoraAnterior -> FechaHoraNueva) junto con el autor y el motivo. El estado vuelve a Pendiente y FechaAlerta
-- a NULL para que el servicio de recordatorios avise de nuevo.
CREATE PROCEDURE [dbo].[sp_CrmSeguimiento_Reprogramar]
    @IdSeguimiento  INT,
    @NuevaFechaHora DATETIME2(0),
    @Motivo         VARCHAR(500),
    @IdUsuario      INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Estado VARCHAR(15), @FechaAnterior DATETIME2(0);

    BEGIN TRANSACTION;

    SELECT @Estado = Estado, @FechaAnterior = FechaHora
    FROM SeguimientoCRM WITH (UPDLOCK, ROWLOCK) WHERE IdSeguimiento = @IdSeguimiento;

    IF @Estado IS NULL
        THROW 50001, N'El seguimiento indicado no existe.', 1;

    IF @Estado IN ('Completado', 'Cancelado')
        THROW 50001, N'El seguimiento ya está cerrado; cree un seguimiento nuevo.', 1;

    IF @NuevaFechaHora <= dbo.fn_CrmAhora()
        THROW 50001, N'La nueva fecha y hora ya pasaron; ingrese una fecha y hora futuras.', 1;

    UPDATE SeguimientoCRM
    SET FechaHora = @NuevaFechaHora, Estado = 'Pendiente', FechaAlerta = NULL
    WHERE IdSeguimiento = @IdSeguimiento;

    INSERT SeguimientoHistorial (IdSeguimiento, Accion, FechaHoraAnterior, FechaHoraNueva, Motivo, IdUsuario)
    VALUES (@IdSeguimiento, 'Reprogramado', @FechaAnterior, @NuevaFechaHora, @Motivo, @IdUsuario);

    COMMIT TRANSACTION;
END
