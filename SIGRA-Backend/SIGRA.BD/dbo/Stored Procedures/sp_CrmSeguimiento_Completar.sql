-- Completa un seguimiento y registra la interacción vinculada (CRMGPSC-018), todo en una transacción.
-- Devuelve Aplicado = 1 si se completó, o 0 si ya estaba cerrado (Completado/Cancelado): en ese caso no cambia nada,
-- así un doble clic o un reintento no duplican el cierre ni la interacción.
-- La interacción hereda empresa y contacto; Tipo = tipo del seguimiento (los seis tipos existen también como tipo de
-- interacción), Fecha = fecha real, Detalle = motivo del seguimiento, Resultado y ProximoPaso los del cierre.
CREATE PROCEDURE [dbo].[sp_CrmSeguimiento_Completar]
    @IdSeguimiento INT,
    @FechaReal     DATETIME2(0),
    @Resultado     VARCHAR(500),
    @Observaciones VARCHAR(1000) = NULL,
    @ProximoPaso   VARCHAR(500) = NULL,
    @IdUsuario     INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Estado VARCHAR(15), @IdProspecto INT, @IdCliente INT, @IdContacto INT, @Tipo VARCHAR(20), @Motivo VARCHAR(500),
            @IdInteraccion INT;

    BEGIN TRANSACTION;

    SELECT @Estado = Estado, @IdProspecto = IdProspecto, @IdCliente = IdCliente, @IdContacto = IdContactoEmpresa,
           @Tipo = Tipo, @Motivo = Motivo
    FROM SeguimientoCRM WITH (UPDLOCK, ROWLOCK) WHERE IdSeguimiento = @IdSeguimiento;

    IF @Estado IS NULL
        THROW 50001, N'El seguimiento indicado no existe.', 1;

    IF @Estado IN ('Completado', 'Cancelado')
    BEGIN
        ROLLBACK TRANSACTION;
        SELECT CAST(0 AS BIT) AS Aplicado;
        RETURN;
    END

    IF @FechaReal > dbo.fn_CrmAhora()
        THROW 50001, N'La fecha real no puede ser futura.', 1;

    INSERT InteraccionCRM (IdProspecto, IdCliente, IdContactoEmpresa, IdUsuario, Fecha, Tipo, Detalle, Resultado, ProximoPaso)
    VALUES (@IdProspecto, @IdCliente, @IdContacto, @IdUsuario, @FechaReal, @Tipo, @Motivo, @Resultado, @ProximoPaso);
    SET @IdInteraccion = SCOPE_IDENTITY();

    UPDATE SeguimientoCRM
    SET Estado = 'Completado', FechaReal = @FechaReal, Resultado = @Resultado, Observaciones = @Observaciones,
        ProximoPaso = @ProximoPaso, FechaCierre = SYSUTCDATETIME(), IdUsuarioCierre = @IdUsuario, IdInteraccion = @IdInteraccion
    WHERE IdSeguimiento = @IdSeguimiento;

    INSERT SeguimientoHistorial (IdSeguimiento, Accion, Motivo, IdUsuario)
    VALUES (@IdSeguimiento, 'Completado', @Resultado, @IdUsuario);

    COMMIT TRANSACTION;

    SELECT CAST(1 AS BIT) AS Aplicado;
END
