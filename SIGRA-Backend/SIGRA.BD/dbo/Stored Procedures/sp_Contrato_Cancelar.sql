CREATE PROCEDURE sp_Contrato_Cancelar
    @IdContrato                INT,
    @Motivo                    VARCHAR(300),
    @IdUsuario                 INT,
    @FechaCancelacion          DATE = NULL,
    @PenalizacionMonto         DECIMAL(12, 2) = NULL,
    @PenalizacionJustificacion VARCHAR(300) = NULL,
    @Observaciones             VARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Hoy DATE = ISNULL(@FechaCancelacion, CAST(GETDATE() AS DATE));
    DECLARE @Etiqueta VARCHAR(20) = 'CT-' + RIGHT('0000' + CAST(@IdContrato AS VARCHAR(10)), 4);
    DECLARE @Equipos TABLE (IdEquipo INT PRIMARY KEY);

    BEGIN TRANSACTION;

    INSERT INTO @Equipos (IdEquipo)
    SELECT IdEquipo FROM ContratoEquipo WHERE IdContrato = @IdContrato AND FechaDevolucion IS NULL;

    UPDATE Contrato
    SET Estado = 'Cancelado', MotivoCancelacion = @Motivo, FechaCancelacion = @Hoy, PenalizacionMonto = @PenalizacionMonto,
        PenalizacionJustificacion = @PenalizacionJustificacion, ObservacionesCancelacion = @Observaciones
    WHERE IdContrato = @IdContrato;

    -- Si el contrato aún no había empezado, la devolución queda en la fecha de asignación (no puede ser anterior).
    UPDATE ContratoEquipo SET FechaDevolucion = CASE WHEN FechaAsignacion > @Hoy THEN FechaAsignacion ELSE @Hoy END
    WHERE IdContrato = @IdContrato AND FechaDevolucion IS NULL;

    UPDATE e SET Estado = 'Disponible'
    FROM Equipo e
    INNER JOIN @Equipos q ON q.IdEquipo = e.IdEquipo
    WHERE e.Estado = 'Alquilado';

    -- Los accesorios que se habían descontado de bodega regresan al stock.
    UPDATE a SET a.Cantidad = a.Cantidad + ca.Cantidad
    FROM AccesorioModelo a
    INNER JOIN ContratoAccesorio ca ON ca.IdAccesorioModelo = a.IdAccesorioModelo
    WHERE ca.IdContrato = @IdContrato AND ca.DescontadoDeStock = 1;

    UPDATE ContratoAccesorio SET DescontadoDeStock = 0 WHERE IdContrato = @IdContrato;

    INSERT INTO MovimientoInventario (IdEquipo, IdUsuario, TipoMovimiento, EstadoAnterior, EstadoNuevo, Observacion)
    SELECT IdEquipo, @IdUsuario, N'Devolución de cliente', 'Alquilado', 'Disponible', N'Cancelación del contrato ' + @Etiqueta
    FROM @Equipos;

    INSERT INTO BitacoraEquipo (IdEquipo, Descripcion)
    SELECT IdEquipo, N'Liberado por la cancelación del contrato ' + @Etiqueta + N'.' FROM @Equipos;

    -- Tarea para el equipo técnico: verificar físicamente que los equipos fueron devueltos.
    IF EXISTS (SELECT 1 FROM @Equipos)
        INSERT INTO Notificacion (IdUsuario, IdModulo, Titulo, Mensaje, Entidad, IdEntidad)
        SELECT u.IdUsuario, 3, N'Verificar devolución de equipos',
               N'El contrato ' + @Etiqueta + N' se canceló. Verifique que los ' + CAST((SELECT COUNT(*) FROM @Equipos) AS NVARCHAR(10))
               + N' equipo(s) fueron devueltos.', N'Contrato', @IdContrato
        FROM Usuario u
        INNER JOIN Rol r ON r.IdRol = u.IdRol
        WHERE u.Activo = 1 AND r.Nombre IN (N'Coordinador técnico', N'Administrador del sistema');

    COMMIT TRANSACTION;
END
