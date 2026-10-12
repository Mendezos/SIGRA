CREATE PROCEDURE sp_Contrato_Renovar
    @IdContrato        INT,
    @NuevaFecha        DATE,
    @NuevoMonto        DECIMAL(12, 2) = NULL,
    @IdsAgregar        VARCHAR(MAX) = NULL,
    @IdsRetirar        VARCHAR(MAX) = NULL,
    @Observacion       VARCHAR(MAX) = NULL,
    @IdUsuario         INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);
    DECLARE @Etiqueta VARCHAR(20) = 'CT-' + RIGHT('0000' + CAST(@IdContrato AS VARCHAR(10)), 4);
    DECLARE @VencimientoAnterior DATE, @MontoFinal DECIMAL(12, 2), @Esperados INT;
    DECLARE @Agregar TABLE (IdEquipo INT PRIMARY KEY);
    DECLARE @Retirar TABLE (IdEquipo INT PRIMARY KEY);

    INSERT INTO @Agregar (IdEquipo)
    SELECT DISTINCT CAST(value AS INT) FROM STRING_SPLIT(ISNULL(@IdsAgregar, ''), ',') WHERE LTRIM(RTRIM(value)) <> '';
    INSERT INTO @Retirar (IdEquipo)
    SELECT DISTINCT CAST(value AS INT) FROM STRING_SPLIT(ISNULL(@IdsRetirar, ''), ',') WHERE LTRIM(RTRIM(value)) <> '';
    SET @Esperados = (SELECT COUNT(*) FROM @Agregar);

    BEGIN TRANSACTION;

    SELECT @VencimientoAnterior = FechaVencimiento, @MontoFinal = ISNULL(@NuevoMonto, MontoMensual)
    FROM Contrato WHERE IdContrato = @IdContrato;

    -- Equipos que salen del contrato: quedan Disponibles en el inventario
    UPDATE ce SET FechaDevolucion = @Hoy
    FROM ContratoEquipo ce
    INNER JOIN @Retirar r ON r.IdEquipo = ce.IdEquipo
    WHERE ce.IdContrato = @IdContrato AND ce.FechaDevolucion IS NULL;

    UPDATE e SET Estado = 'Disponible'
    FROM Equipo e
    INNER JOIN @Retirar r ON r.IdEquipo = e.IdEquipo
    WHERE e.Estado = 'Alquilado';

    INSERT INTO MovimientoInventario (IdEquipo, IdUsuario, TipoMovimiento, EstadoAnterior, EstadoNuevo, Observacion)
    SELECT IdEquipo, @IdUsuario, N'Devolución de cliente', 'Alquilado', 'Disponible', N'Retiro del contrato ' + @Etiqueta + N' en su renovación'
    FROM @Retirar;

    INSERT INTO BitacoraEquipo (IdEquipo, Descripcion)
    SELECT IdEquipo, N'Retirado del contrato ' + @Etiqueta + N' en su renovación.' FROM @Retirar;

    -- Equipos nuevos: solo si siguen disponibles
    UPDATE e SET Estado = 'Alquilado'
    FROM Equipo e
    INNER JOIN @Agregar a ON a.IdEquipo = e.IdEquipo
    WHERE e.Estado = 'Disponible';

    IF @@ROWCOUNT <> @Esperados
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, 'El equipo seleccionado no se encuentra disponible en el inventario.', 1;
    END

    INSERT INTO ContratoEquipo (IdContrato, IdEquipo, FechaAsignacion)
    SELECT @IdContrato, IdEquipo, @Hoy FROM @Agregar;

    INSERT INTO MovimientoInventario (IdEquipo, IdUsuario, TipoMovimiento, EstadoAnterior, EstadoNuevo, Observacion)
    SELECT IdEquipo, @IdUsuario, N'Asignación a contrato', 'Disponible', 'Alquilado', N'Contrato ' + @Etiqueta + N' (renovación)'
    FROM @Agregar;

    INSERT INTO BitacoraEquipo (IdEquipo, Descripcion)
    SELECT IdEquipo, N'Asignado al contrato ' + @Etiqueta + N' en su renovación.' FROM @Agregar;

    UPDATE Contrato
    SET Estado = 'Renovado', FechaVencimiento = @NuevaFecha, MontoMensual = @MontoFinal
    WHERE IdContrato = @IdContrato;

    INSERT INTO RenovacionContrato (IdContrato, FechaRenovacion, NuevaFechaVencimiento, Observacion, IdUsuario, FechaVencimientoAnterior, MontoMensual)
    VALUES (@IdContrato, @Hoy, @NuevaFecha, @Observacion, @IdUsuario, @VencimientoAnterior, @MontoFinal);

    -- Una renovación reinicia el ciclo de alertas de vencimiento
    DELETE FROM AlertaContrato WHERE IdContrato = @IdContrato AND Tipo IN ('90 dias', '30 dias');

    COMMIT TRANSACTION;
END
