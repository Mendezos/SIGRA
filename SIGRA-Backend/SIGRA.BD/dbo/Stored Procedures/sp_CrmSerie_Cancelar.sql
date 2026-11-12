-- Cancela una serie de contactos periódicos (CRMGPSC-024).
-- Cancela SOLO los seguimientos futuros que siguen Pendientes (fecha posterior a la hora actual de Costa Rica), con el motivo
-- de la cancelación. Conserva los completados, los cancelados antes y los que ya vencieron sin cerrarse (Atrasados): esos
-- los cierra el vendedor a mano. La serie pasa a Cancelada.
-- Devuelve Aplicado (1 = se canceló; 0 = la serie ya estaba cancelada y no se cambió nada) y SeguimientosCancelados.
CREATE PROCEDURE [dbo].[sp_CrmSerie_Cancelar]
    @IdSerie   INT,
    @Motivo    VARCHAR(500),
    @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Estado VARCHAR(15), @Cancelados INT, @Ahora DATETIME2(0);
    DECLARE @Afectados TABLE (IdSeguimiento INT NOT NULL);

    BEGIN TRANSACTION;

    SELECT @Estado = Estado FROM SerieContactoCRM WITH (UPDLOCK, ROWLOCK) WHERE IdSerie = @IdSerie;

    IF @Estado IS NULL
        THROW 50001, N'La serie indicada no existe.', 1;

    IF @Estado = 'Cancelada'
    BEGIN
        ROLLBACK TRANSACTION;
        SELECT CAST(0 AS BIT) AS Aplicado, 0 AS SeguimientosCancelados;
        RETURN;
    END

    SET @Ahora = dbo.fn_CrmAhora();

    UPDATE SeguimientoCRM
    SET Estado = 'Cancelado', MotivoCancelacion = @Motivo, FechaCierre = SYSUTCDATETIME(), IdUsuarioCierre = @IdUsuario
    OUTPUT inserted.IdSeguimiento INTO @Afectados (IdSeguimiento)
    WHERE IdSerie = @IdSerie AND Estado = 'Pendiente' AND FechaHora > @Ahora;
    SET @Cancelados = @@ROWCOUNT;

    INSERT SeguimientoHistorial (IdSeguimiento, Accion, Motivo, IdUsuario)
    SELECT IdSeguimiento, 'Cancelado', @Motivo, @IdUsuario FROM @Afectados;

    UPDATE SerieContactoCRM
    SET Estado = 'Cancelada', MotivoCancelacion = @Motivo, FechaCancelacion = SYSUTCDATETIME(), IdUsuarioCancela = @IdUsuario
    WHERE IdSerie = @IdSerie;

    COMMIT TRANSACTION;

    SELECT CAST(1 AS BIT) AS Aplicado, @Cancelados AS SeguimientosCancelados;
END
