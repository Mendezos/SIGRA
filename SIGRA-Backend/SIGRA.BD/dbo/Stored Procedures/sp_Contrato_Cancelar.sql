CREATE PROCEDURE sp_Contrato_Cancelar
    @IdContrato INT,
    @Motivo     VARCHAR(300),
    @IdUsuario  INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);
    DECLARE @Etiqueta VARCHAR(20) = 'CT-' + RIGHT('0000' + CAST(@IdContrato AS VARCHAR(10)), 4);
    DECLARE @Equipos TABLE (IdEquipo INT PRIMARY KEY);

    BEGIN TRANSACTION;

    INSERT INTO @Equipos (IdEquipo)
    SELECT IdEquipo FROM ContratoEquipo WHERE IdContrato = @IdContrato AND FechaDevolucion IS NULL;

    UPDATE Contrato SET Estado = 'Cancelado', MotivoCancelacion = @Motivo, FechaCancelacion = @Hoy
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

    COMMIT TRANSACTION;
END
