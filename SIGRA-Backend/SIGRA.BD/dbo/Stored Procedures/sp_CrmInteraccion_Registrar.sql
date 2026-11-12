-- CRMGPSC-013: registra una interacción comercial (llamada, correo, visita, reunión, WhatsApp, acuerdo u otro) con un prospecto o cliente.
-- @Fecha es hora de pared de Costa Rica (sin zona horaria) y no puede ser futura. Devuelve la interacción creada.
-- Las reglas se validan dentro de la transacción (con la fila de la empresa bloqueada) para que un cambio de estado concurrente
-- (por ejemplo, descartar el prospecto) no deje pasar un registro inválido.
CREATE PROCEDURE [dbo].[sp_CrmInteraccion_Registrar]
    @TipoEmpresa       VARCHAR(10),
    @IdEmpresa         INT,
    @IdUsuario         INT,
    @Tipo              VARCHAR(50),
    @Fecha             DATETIME,
    @Detalle           VARCHAR(MAX),
    @Resultado         VARCHAR(MAX) = NULL,
    @ProximoPaso       VARCHAR(MAX) = NULL,
    @IdContactoEmpresa INT          = NULL,
    @IdCotizacion      INT          = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Estado VARCHAR(30), @Activo BIT, @IdInteraccion INT;

    IF @TipoEmpresa NOT IN ('Prospecto', 'Cliente')
        THROW 50001, N'El tipo de empresa debe ser Prospecto o Cliente.', 1;

    IF @Tipo NOT IN ('Llamada', 'Correo', 'Visita', 'Reunión', 'WhatsApp', 'Acuerdo', 'Otro')
        THROW 50001, N'El tipo de interacción no es válido.', 1;

    IF LEN(@Detalle) > 2000
        THROW 50001, N'La descripción no puede superar los 2000 caracteres.', 1;
    IF LEN(@Resultado) > 500
        THROW 50001, N'El resultado no puede superar los 500 caracteres.', 1;
    IF LEN(@ProximoPaso) > 500
        THROW 50001, N'El próximo paso no puede superar los 500 caracteres.', 1;

    IF @Fecha > CONVERT(DATETIME, dbo.fn_CrmAhora())
        THROW 50001, N'La fecha de la interacción no puede ser futura. Si es una actividad por hacer, programe un seguimiento.', 1;

    BEGIN TRANSACTION;

    IF @TipoEmpresa = 'Prospecto'
        SELECT @Estado = Estado FROM Prospecto WITH (UPDLOCK, HOLDLOCK) WHERE IdProspecto = @IdEmpresa;
    ELSE
        SELECT @Estado = CASE WHEN Activo = 1 THEN 'Activo' ELSE 'Inactivo' END, @Activo = Activo
        FROM Cliente WITH (UPDLOCK, HOLDLOCK) WHERE IdCliente = @IdEmpresa;

    IF @Estado IS NULL
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'La empresa indicada no existe.', 1;
    END

    IF @TipoEmpresa = 'Prospecto' AND @Estado = 'Descartado'
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'No se pueden registrar interacciones en un prospecto descartado; reactívelo primero.', 1;
    END

    IF @TipoEmpresa = 'Prospecto' AND @Estado = 'Convertido'
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'No se pueden registrar interacciones en un prospecto convertido; regístrela en el cliente.', 1;
    END

    IF @TipoEmpresa = 'Cliente' AND @Activo = 0
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'El cliente está inactivo.', 1;
    END

    IF @IdContactoEmpresa IS NOT NULL
    BEGIN
        DECLARE @ContactoActivo BIT;
        SELECT @ContactoActivo = ce.Activo
        FROM ContactoEmpresa ce
        WHERE ce.IdContactoEmpresa = @IdContactoEmpresa
          AND ((@TipoEmpresa = 'Prospecto' AND ce.IdProspecto = @IdEmpresa) OR (@TipoEmpresa = 'Cliente' AND ce.IdCliente = @IdEmpresa));

        IF @ContactoActivo IS NULL
        BEGIN
            ROLLBACK TRANSACTION;
            THROW 50001, N'El contacto seleccionado no pertenece a la empresa.', 1;
        END

        IF @ContactoActivo = 0
        BEGIN
            ROLLBACK TRANSACTION;
            THROW 50001, N'El contacto seleccionado está inactivo; elija un contacto activo.', 1;
        END
    END

    IF @IdCotizacion IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM Cotizacion c
                       WHERE c.IdCotizacion = @IdCotizacion
                         AND ((@TipoEmpresa = 'Prospecto' AND c.IdProspecto = @IdEmpresa) OR (@TipoEmpresa = 'Cliente' AND c.IdCliente = @IdEmpresa)))
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'La cotización seleccionada no pertenece a la empresa.', 1;
    END

    INSERT INTO InteraccionCRM (IdProspecto, IdCliente, IdUsuario, Fecha, Tipo, Detalle, IdContactoEmpresa, Resultado, ProximoPaso, IdCotizacion)
    VALUES (CASE WHEN @TipoEmpresa = 'Prospecto' THEN @IdEmpresa END,
            CASE WHEN @TipoEmpresa = 'Cliente' THEN @IdEmpresa END,
            @IdUsuario, @Fecha, @Tipo, @Detalle, @IdContactoEmpresa, @Resultado, @ProximoPaso, @IdCotizacion);

    SET @IdInteraccion = SCOPE_IDENTITY();

    COMMIT TRANSACTION;

    SELECT i.IdInteraccion,
           @TipoEmpresa AS TipoEmpresa,
           @IdEmpresa AS IdEmpresa,
           COALESCE(p.Empresa, c.Empresa) AS Empresa,
           i.Tipo, i.Fecha,
           i.IdContactoEmpresa, ce.Nombre AS Contacto,
           i.Detalle AS Descripcion, i.Resultado, i.ProximoPaso, i.IdCotizacion,
           i.IdUsuario, u.Nombre AS Autor,
           TODATETIMEOFFSET(i.FechaRegistro, '+00:00') AS FechaRegistro
    FROM InteraccionCRM i
    JOIN Usuario u ON u.IdUsuario = i.IdUsuario
    LEFT JOIN Prospecto p ON p.IdProspecto = i.IdProspecto
    LEFT JOIN Cliente c ON c.IdCliente = i.IdCliente
    LEFT JOIN ContactoEmpresa ce ON ce.IdContactoEmpresa = i.IdContactoEmpresa
    WHERE i.IdInteraccion = @IdInteraccion;
END
