-- CRMGPSC-004: descarta un prospecto. En UNA transacción: estado -> Descartado (con motivo, fecha y observación), movimiento en el historial de estados,
-- seguimientos pendientes o atrasados -> Cancelado (motivo "Prospecto descartado", con su movimiento en SeguimientoHistorial) y series activas -> Cancelada.
-- El historial comercial (interacciones, notas, cotizaciones) no se toca.
-- Devuelve una fila: Resultado = 'Aplicado' | 'SinCambios' (ya estaba Descartado: no duplica nada) | 'Convertido' (rechazada; IdCliente indica el cliente vinculado).
CREATE PROCEDURE [dbo].[sp_CrmProspecto_Descartar]
    @IdProspecto  INT,
    @Motivo       VARCHAR(100),
    @Fecha        DATE,
    @Observacion  VARCHAR(500) = NULL,
    @IdUsuario    INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Estado VARCHAR(30), @IdCliente INT, @ClienteEmpresa VARCHAR(150), @FechaIngreso DATE;
    DECLARE @Ahora DATETIME2(0) = dbo.fn_CrmAhora();
    DECLARE @Hoy DATE = CONVERT(DATE, @Ahora);
    DECLARE @SegCancelados INT = 0, @SeriesCanceladas INT = 0;
    DECLARE @Cancelados TABLE (IdSeguimiento INT, FechaHora DATETIME2(0));

    BEGIN TRANSACTION;

    SELECT @Estado = p.Estado, @IdCliente = p.IdCliente, @FechaIngreso = p.FechaIngreso
    FROM Prospecto p WITH (UPDLOCK, HOLDLOCK)
    WHERE p.IdProspecto = @IdProspecto;

    IF @Estado IS NULL THROW 50001, N'El prospecto indicado no existe.', 1;

    IF @Estado IN ('Convertido', 'Descartado')
    BEGIN
        SELECT @ClienteEmpresa = Empresa FROM Cliente WHERE IdCliente = @IdCliente;
        COMMIT TRANSACTION;
        SELECT CASE WHEN @Estado = 'Convertido' THEN 'Convertido' ELSE 'SinCambios' END AS Resultado, @Estado AS Estado,
               @IdCliente AS IdCliente, @ClienteEmpresa AS ClienteEmpresa, 0 AS SeguimientosCancelados, 0 AS SeriesCanceladas;
        RETURN;
    END;

    IF @Fecha > @Hoy THROW 50001, N'La fecha del descarte no puede ser futura.', 1;
    IF @Fecha < @FechaIngreso THROW 50001, N'La fecha del descarte no puede ser anterior a la fecha de ingreso del prospecto.', 1;

    UPDATE Prospecto
    SET Estado = 'Descartado', MotivoDescarte = @Motivo, ObservacionDescarte = @Observacion,
        FechaDescarte = DATEADD(DAY, DATEDIFF(DAY, @Hoy, @Fecha), @Ahora), FechaActualizacion = SYSUTCDATETIME()
    WHERE IdProspecto = @IdProspecto;

    INSERT INTO ProspectoEstadoHistorial (IdProspecto, EstadoAnterior, EstadoNuevo, Motivo, Observacion, IdUsuario)
    VALUES (@IdProspecto, @Estado, 'Descartado', @Motivo, @Observacion, @IdUsuario);

    UPDATE SeguimientoCRM
    SET Estado = 'Cancelado', MotivoCancelacion = 'Prospecto descartado', FechaCierre = SYSUTCDATETIME(), IdUsuarioCierre = @IdUsuario
    OUTPUT inserted.IdSeguimiento, deleted.FechaHora INTO @Cancelados (IdSeguimiento, FechaHora)
    WHERE IdProspecto = @IdProspecto AND Estado IN ('Pendiente', 'Atrasado');
    SET @SegCancelados = @@ROWCOUNT;

    INSERT INTO SeguimientoHistorial (IdSeguimiento, Accion, FechaHoraAnterior, Motivo, IdUsuario)
    SELECT IdSeguimiento, 'Cancelado', FechaHora, 'Prospecto descartado', @IdUsuario FROM @Cancelados;

    UPDATE SerieContactoCRM
    SET Estado = 'Cancelada', MotivoCancelacion = 'Prospecto descartado', FechaCancelacion = SYSUTCDATETIME(), IdUsuarioCancela = @IdUsuario
    WHERE IdProspecto = @IdProspecto AND Estado = 'Activa';
    SET @SeriesCanceladas = @@ROWCOUNT;

    COMMIT TRANSACTION;

    SELECT 'Aplicado' AS Resultado, 'Descartado' AS Estado, CAST(NULL AS INT) AS IdCliente, CAST(NULL AS VARCHAR(150)) AS ClienteEmpresa,
           @SegCancelados AS SeguimientosCancelados, @SeriesCanceladas AS SeriesCanceladas;
END
