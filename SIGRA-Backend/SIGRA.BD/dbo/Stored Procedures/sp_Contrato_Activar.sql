-- Pasa un contrato de Borrador a Activo: guarda el documento firmado, asigna los equipos (quedan Alquilados) y
-- descuenta los accesorios de bodega. Si el contrato es una renovación (IdContratoOrigen), el contrato anterior
-- pasa a Renovado, sus equipos se traspasan al nuevo y los que ya no se alquilan quedan Disponibles.
CREATE PROCEDURE sp_Contrato_Activar
    @IdContrato      INT,
    @FechaFirma      DATE,
    @FechaInicioReal DATE = NULL,
    @NombreArchivo   VARCHAR(200),
    @Contenido       VARBINARY(MAX),
    @IdUsuario       INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Estado VARCHAR(30), @Inicio DATE, @Vencimiento DATE, @Origen INT, @OrigenVence DATE;
    DECLARE @Etiqueta VARCHAR(20) = 'CT-' + RIGHT('0000' + CAST(@IdContrato AS VARCHAR(10)), 4);
    DECLARE @Nuevos TABLE (IdEquipo INT PRIMARY KEY);
    DECLARE @Traspaso TABLE (IdEquipo INT PRIMARY KEY);
    DECLARE @Liberados TABLE (IdEquipo INT PRIMARY KEY);
    DECLARE @Accesorios NVARCHAR(MAX);

    BEGIN TRANSACTION;

    SELECT @Estado = Estado, @Inicio = FechaInicio, @Vencimiento = FechaVencimiento, @Origen = IdContratoOrigen
    FROM Contrato WITH (UPDLOCK) WHERE IdContrato = @IdContrato;

    IF @Estado IS NULL THROW 50001, 'El contrato indicado no existe.', 1;
    IF @Estado <> 'Borrador' THROW 50001, 'Solo se pueden activar contratos en borrador.', 1;

    IF @FechaInicioReal IS NOT NULL
    BEGIN
        IF @FechaInicioReal >= @Vencimiento THROW 50001, 'La fecha real de inicio debe ser anterior a la fecha de vencimiento.', 1;
        SET @Inicio = @FechaInicioReal;
    END

    IF @Origen IS NOT NULL
        SELECT @OrigenVence = FechaVencimiento FROM Contrato WHERE IdContrato = @Origen;

    -- Equipos: deben seguir disponibles (o, en una renovación, estar ya en el contrato anterior).
    DECLARE @Problema NVARCHAR(300) = (
        SELECT TOP 1 e.NumeroSerie + N' (' + e.Estado + N')'
        FROM ContratoEquipoBorrador b
        INNER JOIN Equipo e ON e.IdEquipo = b.IdEquipo
        WHERE b.IdContrato = @IdContrato
          AND NOT (e.Estado = 'Disponible' AND e.Propietario = 'Radifax')
          AND NOT (@Origen IS NOT NULL AND e.Estado = 'Alquilado' AND EXISTS (
                SELECT 1 FROM ContratoEquipo ce WHERE ce.IdContrato = @Origen AND ce.IdEquipo = e.IdEquipo AND ce.FechaDevolucion IS NULL))
        ORDER BY e.NumeroSerie);
    IF @Problema IS NOT NULL
    BEGIN
        DECLARE @Mensaje NVARCHAR(400) = N'El equipo ' + @Problema + N' ya no está disponible en el inventario. Reemplácelo en el borrador antes de activar el contrato.';
        THROW 50001, @Mensaje, 1;
    END

    IF NOT EXISTS (SELECT 1 FROM ContratoEquipoBorrador WHERE IdContrato = @IdContrato)
        THROW 50001, 'El contrato no tiene equipos para asignar.', 1;

    -- Equipos que se asignan por primera vez, los que se traspasan desde el contrato anterior y los que se liberan.
    INSERT INTO @Traspaso (IdEquipo)
    SELECT b.IdEquipo FROM ContratoEquipoBorrador b
    INNER JOIN ContratoEquipo ce ON ce.IdContrato = @Origen AND ce.IdEquipo = b.IdEquipo AND ce.FechaDevolucion IS NULL
    WHERE b.IdContrato = @IdContrato;

    INSERT INTO @Nuevos (IdEquipo)
    SELECT b.IdEquipo FROM ContratoEquipoBorrador b
    WHERE b.IdContrato = @IdContrato AND b.IdEquipo NOT IN (SELECT IdEquipo FROM @Traspaso);

    IF @Origen IS NOT NULL
        INSERT INTO @Liberados (IdEquipo)
        SELECT ce.IdEquipo FROM ContratoEquipo ce
        WHERE ce.IdContrato = @Origen AND ce.FechaDevolucion IS NULL
          AND ce.IdEquipo NOT IN (SELECT IdEquipo FROM ContratoEquipoBorrador WHERE IdContrato = @IdContrato);

    -- Cierra el contrato anterior
    IF @Origen IS NOT NULL
    BEGIN
        UPDATE ContratoEquipo SET FechaDevolucion = CASE WHEN FechaAsignacion > @OrigenVence THEN FechaAsignacion ELSE @OrigenVence END
        WHERE IdContrato = @Origen AND FechaDevolucion IS NULL;

        UPDATE Contrato SET Estado = 'Renovado' WHERE IdContrato = @Origen;

        UPDATE e SET Estado = 'Disponible'
        FROM Equipo e INNER JOIN @Liberados l ON l.IdEquipo = e.IdEquipo WHERE e.Estado = 'Alquilado';

        INSERT INTO MovimientoInventario (IdEquipo, IdUsuario, TipoMovimiento, EstadoAnterior, EstadoNuevo, Observacion)
        SELECT IdEquipo, @IdUsuario, N'Devolución de cliente', 'Alquilado', 'Disponible', N'Ya no se incluye en la renovación ' + @Etiqueta
        FROM @Liberados;

        INSERT INTO BitacoraEquipo (IdEquipo, Descripcion)
        SELECT IdEquipo, N'Liberado en la renovación del contrato (' + @Etiqueta + N').' FROM @Liberados;

        -- Los accesorios del contrato anterior regresan a bodega; los del nuevo se descuentan más abajo.
        UPDATE a SET a.Cantidad = a.Cantidad + ca.Cantidad
        FROM AccesorioModelo a
        INNER JOIN ContratoAccesorio ca ON ca.IdAccesorioModelo = a.IdAccesorioModelo
        WHERE ca.IdContrato = @Origen AND ca.DescontadoDeStock = 1;
        UPDATE ContratoAccesorio SET DescontadoDeStock = 0 WHERE IdContrato = @Origen;
    END

    -- Asigna los equipos nuevos
    UPDATE e SET Estado = 'Alquilado' FROM Equipo e INNER JOIN @Nuevos n ON n.IdEquipo = e.IdEquipo;

    INSERT INTO ContratoEquipo (IdContrato, IdEquipo, FechaAsignacion)
    SELECT @IdContrato, b.IdEquipo, @Inicio FROM ContratoEquipoBorrador b WHERE b.IdContrato = @IdContrato;

    INSERT INTO MovimientoInventario (IdEquipo, IdUsuario, TipoMovimiento, EstadoAnterior, EstadoNuevo, Observacion)
    SELECT IdEquipo, @IdUsuario, N'Asignación a contrato', 'Disponible', 'Alquilado', N'Contrato ' + @Etiqueta
    FROM @Nuevos;

    INSERT INTO BitacoraEquipo (IdEquipo, Descripcion)
    SELECT n.IdEquipo, N'Asignado al contrato ' + @Etiqueta + N'.' FROM @Nuevos n;

    DELETE FROM ContratoEquipoBorrador WHERE IdContrato = @IdContrato;

    -- Accesorios: ahora sí salen de bodega (falla si no alcanza el stock)
    SET @Accesorios = (SELECT IdAccesorioModelo AS idAccesorioModelo, Cantidad AS cantidad FROM ContratoAccesorio WHERE IdContrato = @IdContrato FOR JSON PATH);
    EXEC sp_ContratoAccesorio_Aplicar @IdContrato = @IdContrato, @ItemsJson = @Accesorios, @Descontar = 1;

    INSERT INTO ContratoDocumento (IdContrato, Tipo, Nombre, Contenido, FechaFirma, IdUsuario)
    VALUES (@IdContrato, CASE WHEN @Origen IS NULL THEN 'Contrato firmado' ELSE 'Renovación firmada' END, @NombreArchivo, @Contenido, @FechaFirma, @IdUsuario);

    UPDATE Contrato SET Estado = 'Activo', FechaInicio = @Inicio, FechaFirma = @FechaFirma WHERE IdContrato = @IdContrato;

    COMMIT TRANSACTION;
END
