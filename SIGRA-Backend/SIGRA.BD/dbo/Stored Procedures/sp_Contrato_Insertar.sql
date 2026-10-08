CREATE PROCEDURE sp_Contrato_Insertar
    @Empresa           VARCHAR(150),
    @FechaInicio       DATE,
    @FechaVencimiento  DATE,
    @MontoMensual      DECIMAL(12, 2),
    @Condiciones       VARCHAR(MAX) = NULL,
    @IdVendedor        INT = NULL,
    @IdsEquipo         VARCHAR(MAX),
    @IdUsuario         INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IdCliente INT, @IdContrato INT, @Esperados INT;
    DECLARE @Equipos TABLE (IdEquipo INT PRIMARY KEY);

    INSERT INTO @Equipos (IdEquipo)
    SELECT DISTINCT CAST(value AS INT) FROM STRING_SPLIT(@IdsEquipo, ',') WHERE LTRIM(RTRIM(value)) <> '';
    SET @Esperados = (SELECT COUNT(*) FROM @Equipos);

    BEGIN TRANSACTION;

    SELECT @IdCliente = IdCliente FROM Cliente WHERE Empresa = @Empresa;
    IF @IdCliente IS NULL
    BEGIN
        INSERT INTO Cliente (Empresa) VALUES (@Empresa);
        SET @IdCliente = SCOPE_IDENTITY();
    END

    -- Reserva los equipos solo si siguen disponibles (evita que dos contratos tomen el mismo equipo).
    UPDATE e SET Estado = 'Alquilado'
    FROM Equipo e
    INNER JOIN @Equipos q ON q.IdEquipo = e.IdEquipo
    WHERE e.Estado = 'Disponible';

    IF @@ROWCOUNT <> @Esperados
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, 'El equipo seleccionado no se encuentra disponible en el inventario.', 1;
    END

    INSERT INTO Contrato (IdCliente, Estado, FechaInicio, FechaVencimiento, MontoMensual, Condiciones, IdVendedor)
    VALUES (@IdCliente, 'Activo', @FechaInicio, @FechaVencimiento, @MontoMensual, @Condiciones, @IdVendedor);
    SET @IdContrato = SCOPE_IDENTITY();

    INSERT INTO ContratoEquipo (IdContrato, IdEquipo, FechaAsignacion)
    SELECT @IdContrato, IdEquipo, @FechaInicio FROM @Equipos;

    INSERT INTO MovimientoInventario (IdEquipo, IdUsuario, TipoMovimiento, EstadoAnterior, EstadoNuevo, Observacion)
    SELECT IdEquipo, @IdUsuario, N'Asignación a contrato', 'Disponible', 'Alquilado',
           N'Contrato CT-' + RIGHT('0000' + CAST(@IdContrato AS VARCHAR(10)), 4)
    FROM @Equipos;

    INSERT INTO BitacoraEquipo (IdEquipo, Descripcion)
    SELECT IdEquipo, N'Asignado al contrato CT-' + RIGHT('0000' + CAST(@IdContrato AS VARCHAR(10)), 4) + N' de ' + @Empresa + N'.'
    FROM @Equipos;

    COMMIT TRANSACTION;

    SELECT @IdContrato AS IdContrato;
END
