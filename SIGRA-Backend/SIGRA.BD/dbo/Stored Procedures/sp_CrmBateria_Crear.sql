-- Crea un recordatorio de batería (CRMGPSC-025): fecha de recordatorio = fecha de compra + @MesesAviso meses (11).
-- "Cambio anticipado": si el cliente ya tenía recordatorios abiertos (Pendiente/Notificado) de la MISMA batería (mismo modelo del
-- catálogo, o el mismo texto sin distinguir mayúsculas ni tildes), se cierran en la misma transacción y apuntan al nuevo.
-- Si ya existe una compra MÁS RECIENTE de esa batería, el recordatorio nuevo se guarda directamente como "Cerrado" (solo queda el historial).
-- Los recordatorios "Atendido" nunca se tocan.
-- Lo usan sp_CrmBateria_Registrar (@Estricto = 1: cualquier problema se lanza como error 50001) y
-- sp_CrmBateria_RegistrarDesdeFactura (@Estricto = 0: lo que no se puede crear se informa en @Omitido y no detiene a los demás).
-- Procedimiento interno: las pantallas y la API no lo llaman directamente.
CREATE PROCEDURE [dbo].[sp_CrmBateria_Crear]
    @IdCliente         INT,
    @IdContactoEmpresa INT           = NULL,
    @IdFactura         INT           = NULL,
    @NumeroFactura     VARCHAR(30)   = NULL,
    @IdModelo          INT           = NULL,
    @ModeloBateria     VARCHAR(150)  = NULL,
    @Cantidad          INT,
    @FechaCompra       DATE,
    @IdVendedor        INT,
    @IdUsuario         INT           = NULL,
    @MesesAviso        INT           = 11,
    @Estricto          BIT           = 1,
    @IdRecordatorio    INT           = NULL OUTPUT,
    @Omitido           NVARCHAR(300) = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @IdRecordatorio = NULL;
    SET @Omitido = NULL;

    DECLARE @Hoy DATE = CONVERT(date, dbo.fn_CrmAhora());
    DECLARE @Error NVARCHAR(300) = NULL;
    DECLARE @ClienteActivo BIT;
    DECLARE @NombreModelo VARCHAR(201);
    DECLARE @IdClienteFactura INT, @EstadoFactura VARCHAR(15), @NumeroDeFactura VARCHAR(30), @IdFacturaEncontrada INT;

    SET @NumeroFactura = NULLIF(LTRIM(RTRIM(@NumeroFactura)), '');
    SET @ModeloBateria = NULLIF(LTRIM(RTRIM(@ModeloBateria)), '');

    -- ---------- Validaciones ----------
    SELECT @ClienteActivo = Activo FROM Cliente WHERE IdCliente = @IdCliente;
    IF @ClienteActivo IS NULL SET @Error = N'El cliente indicado no existe.';
    ELSE IF @ClienteActivo = 0 SET @Error = N'El cliente está inactivo; no se pueden registrar compras de batería.';
    ELSE IF @Cantidad IS NULL OR @Cantidad < 1 SET @Error = N'La cantidad debe ser un número entero mayor o igual a 1.';
    ELSE IF @FechaCompra IS NULL SET @Error = N'Debe indicar la fecha de compra.';
    ELSE IF @FechaCompra > @Hoy SET @Error = N'La fecha de compra no puede ser futura.';
    ELSE IF @FechaCompra < '2000-01-01' SET @Error = N'La fecha de compra no es válida.';

    IF @Error IS NULL AND @IdContactoEmpresa IS NOT NULL
    BEGIN
        DECLARE @ContactoCliente INT, @ContactoActivo BIT;
        SELECT @ContactoCliente = IdCliente, @ContactoActivo = Activo FROM ContactoEmpresa WHERE IdContactoEmpresa = @IdContactoEmpresa;
        IF @ContactoCliente IS NULL OR @ContactoCliente <> @IdCliente SET @Error = N'El contacto indicado no pertenece al cliente.';
        ELSE IF @ContactoActivo = 0 SET @Error = N'El contacto indicado está inactivo.';
    END;

    IF @Error IS NULL AND (@IdFactura IS NOT NULL OR @NumeroFactura IS NOT NULL)
    BEGIN
        -- Si el número de factura existe en el sistema se enlaza con la factura (y debe ser del mismo cliente).
        SELECT @IdFacturaEncontrada = IdFactura, @IdClienteFactura = IdCliente, @EstadoFactura = Estado, @NumeroDeFactura = NumeroFactura
        FROM Factura
        WHERE (@IdFactura IS NOT NULL AND IdFactura = @IdFactura)
           OR (@IdFactura IS NULL AND NumeroFactura COLLATE Latin1_General_CI_AI = @NumeroFactura COLLATE Latin1_General_CI_AI);

        IF @IdFacturaEncontrada IS NULL AND @IdFactura IS NOT NULL SET @Error = N'La factura indicada no existe.';
        ELSE IF @IdFacturaEncontrada IS NOT NULL AND @IdClienteFactura <> @IdCliente SET @Error = N'La factura indicada pertenece a otro cliente.';
        ELSE IF @IdFacturaEncontrada IS NOT NULL AND @EstadoFactura = 'Anulada' SET @Error = N'La factura indicada está anulada.';
        ELSE IF @IdFacturaEncontrada IS NOT NULL AND @NumeroFactura IS NOT NULL
             AND @NumeroFactura COLLATE Latin1_General_CI_AI <> @NumeroDeFactura COLLATE Latin1_General_CI_AI
            SET @Error = N'El número de factura no corresponde con la factura indicada.';
        ELSE IF @IdFacturaEncontrada IS NOT NULL
        BEGIN
            SET @IdFactura = @IdFacturaEncontrada;
            SET @NumeroFactura = ISNULL(@NumeroFactura, @NumeroDeFactura);
        END;
    END;

    IF @Error IS NULL AND @IdModelo IS NOT NULL
    BEGIN
        SELECT @NombreModelo = m.Marca + ' ' + m.Modelo
        FROM ModeloEquipo m
        INNER JOIN CategoriaEquipo c ON c.IdCategoria = m.IdCategoria
        WHERE m.IdModelo = @IdModelo AND c.Nombre COLLATE Latin1_General_CI_AI = 'Bateria';
        IF @NombreModelo IS NULL SET @Error = N'El modelo indicado no es una batería del catálogo.';
        ELSE SET @ModeloBateria = ISNULL(@ModeloBateria, LEFT(@NombreModelo, 150));
    END;

    IF @Error IS NULL AND @ModeloBateria IS NULL SET @Error = N'Debe indicar el modelo de la batería.';

    IF @Error IS NULL AND NOT EXISTS (
        SELECT 1 FROM Usuario u INNER JOIN Rol r ON r.IdRol = u.IdRol
        WHERE u.IdUsuario = @IdVendedor AND u.Activo = 1 AND r.Nombre = 'Vendedor / Ejecutivo de cuenta')
        SET @Error = N'El vendedor indicado no está disponible.';

    IF @Error IS NOT NULL
    BEGIN
        IF @Estricto = 1 THROW 50001, @Error, 1;
        SET @Omitido = @Error;
        RETURN;
    END;

    -- ---------- Registro ----------
    BEGIN TRANSACTION;

    -- Un registro a la vez por cliente: así dos compras simultáneas no se pisan al cerrar los recordatorios anteriores.
    DECLARE @Bloqueo INT;
    SELECT @Bloqueo = IdCliente FROM Cliente WITH (UPDLOCK) WHERE IdCliente = @IdCliente;

    -- Doble clic / reintento: la misma compra (mismo cliente, batería, cantidad, fecha y factura) no se registra dos veces.
    DECLARE @IdDuplicado INT;
    SELECT TOP (1) @IdDuplicado = r.IdRecordatorio
    FROM RecordatorioBateria r
    WHERE r.IdCliente = @IdCliente AND r.FechaCompra = @FechaCompra AND r.Cantidad = @Cantidad
      AND ((@IdModelo IS NOT NULL AND r.IdModelo = @IdModelo) OR r.ModeloBateria COLLATE Latin1_General_CI_AI = @ModeloBateria)
      AND ISNULL(r.NumeroFactura, '') COLLATE Latin1_General_CI_AI = ISNULL(@NumeroFactura, '')
    ORDER BY r.IdRecordatorio;

    IF @IdDuplicado IS NOT NULL
    BEGIN
        SET @Error = N'Ya existe un recordatorio para esa misma compra (BT-' + RIGHT('0000' + CONVERT(VARCHAR(10), @IdDuplicado), 4) + N').';
        IF @Estricto = 1 THROW 50001, @Error, 1;
        SET @Omitido = @Error;
        COMMIT TRANSACTION;
        RETURN;
    END;

    -- ¿Hay una compra posterior de la misma batería? Entonces este recordatorio nace cerrado (la batería ya se reemplazó).
    DECLARE @IdPosterior INT, @FechaPosterior DATE;
    SELECT TOP (1) @IdPosterior = r.IdRecordatorio, @FechaPosterior = r.FechaCompra
    FROM RecordatorioBateria r
    WHERE r.IdCliente = @IdCliente AND r.Estado IN ('Pendiente', 'Notificado', 'Atendido') AND r.FechaCompra > @FechaCompra
      AND ((@IdModelo IS NOT NULL AND r.IdModelo = @IdModelo) OR r.ModeloBateria COLLATE Latin1_General_CI_AI = @ModeloBateria)
    ORDER BY r.FechaCompra DESC, r.IdRecordatorio DESC;

    INSERT RecordatorioBateria (IdCliente, IdContactoEmpresa, IdFactura, NumeroFactura, IdModelo, ModeloBateria, Cantidad,
                                FechaCompra, FechaRecordatorio, IdVendedor, Estado, IdUsuarioCrea)
    VALUES (@IdCliente, @IdContactoEmpresa, @IdFactura, @NumeroFactura, @IdModelo, @ModeloBateria, @Cantidad,
            @FechaCompra, DATEADD(MONTH, @MesesAviso, @FechaCompra), @IdVendedor, 'Pendiente', @IdUsuario);
    SET @IdRecordatorio = SCOPE_IDENTITY();

    IF @IdPosterior IS NOT NULL
    BEGIN
        UPDATE RecordatorioBateria
        SET Estado = 'Cerrado', FechaCierre = SYSUTCDATETIME(), IdRecordatorioNuevo = @IdPosterior,
            MotivoCierre = N'Reemplazada por una compra posterior (fecha ' + CONVERT(VARCHAR(10), @FechaPosterior, 103) + N')'
        WHERE IdRecordatorio = @IdRecordatorio;
    END
    ELSE
    BEGIN
        UPDATE RecordatorioBateria
        SET Estado = 'Cerrado', FechaCierre = SYSUTCDATETIME(), IdRecordatorioNuevo = @IdRecordatorio,
            MotivoCierre = N'Reemplazada por una compra nueva (fecha ' + CONVERT(VARCHAR(10), @FechaCompra, 103) + N')'
        WHERE IdCliente = @IdCliente AND Estado IN ('Pendiente', 'Notificado') AND IdRecordatorio <> @IdRecordatorio
          AND FechaCompra <= @FechaCompra
          AND ((@IdModelo IS NOT NULL AND IdModelo = @IdModelo) OR ModeloBateria COLLATE Latin1_General_CI_AI = @ModeloBateria);
    END;

    COMMIT TRANSACTION;
END
