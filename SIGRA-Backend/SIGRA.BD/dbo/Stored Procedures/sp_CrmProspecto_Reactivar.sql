-- CRMGPSC-004: reactiva un prospecto Descartado. El usuario define el estado inicial y el próximo seguimiento (fecha y hora futuras de Costa Rica).
-- En UNA transacción: cambia el estado (conservando el motivo del descarte anterior, que además queda en el historial de estados),
-- registra el movimiento y crea el seguimiento (Origen "Prospecto") para el vendedor responsable. Si el responsable está inactivo se debe
-- indicar @IdVendedor (otro vendedor activo), que pasa a ser el responsable del prospecto.
-- Devuelve una fila: Resultado = 'Aplicado' | 'SinCambios' (el prospecto ya estaba activo) | 'Convertido' (rechazada; IdCliente = cliente vinculado).
CREATE PROCEDURE [dbo].[sp_CrmProspecto_Reactivar]
    @IdProspecto      INT,
    @EstadoInicial    VARCHAR(30),
    @FechaHoraSeguim  DATETIME2(0),
    @IdVendedor       INT = NULL,
    @IdUsuario        INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Estado VARCHAR(30), @IdCliente INT, @ClienteEmpresa VARCHAR(150), @VendedorActual INT, @MotivoDescarte VARCHAR(100);
    DECLARE @Responsable INT, @IdSeguimiento INT, @IdContacto INT;
    DECLARE @Ahora DATETIME2(0) = dbo.fn_CrmAhora();

    BEGIN TRANSACTION;

    SELECT @Estado = p.Estado, @IdCliente = p.IdCliente, @VendedorActual = p.IdVendedor, @MotivoDescarte = p.MotivoDescarte
    FROM Prospecto p WITH (UPDLOCK, HOLDLOCK)
    WHERE p.IdProspecto = @IdProspecto;

    IF @Estado IS NULL THROW 50001, N'El prospecto indicado no existe.', 1;

    IF @Estado <> 'Descartado'
    BEGIN
        SELECT @ClienteEmpresa = Empresa FROM Cliente WHERE IdCliente = @IdCliente;
        COMMIT TRANSACTION;
        SELECT CASE WHEN @Estado = 'Convertido' THEN 'Convertido' ELSE 'SinCambios' END AS Resultado, @Estado AS Estado,
               @IdCliente AS IdCliente, @ClienteEmpresa AS ClienteEmpresa, CAST(NULL AS INT) AS IdSeguimiento;
        RETURN;
    END;

    IF @FechaHoraSeguim <= @Ahora
        THROW 50001, N'El próximo seguimiento debe programarse en una fecha y hora futuras.', 1;

    -- Responsable del nuevo seguimiento: el vendedor del prospecto, que debe seguir activo.
    IF @VendedorActual IS NOT NULL AND EXISTS (
        SELECT 1 FROM Usuario u INNER JOIN Rol r ON r.IdRol = u.IdRol
        WHERE u.IdUsuario = @VendedorActual AND u.Activo = 1 AND r.Nombre = 'Vendedor / Ejecutivo de cuenta')
        AND (@IdVendedor IS NULL OR @IdVendedor = @VendedorActual)
        SET @Responsable = @VendedorActual;
    ELSE
    BEGIN
        IF @IdVendedor IS NULL
            THROW 50001, N'El vendedor responsable del prospecto está inactivo. Elija otro vendedor activo para reactivarlo.', 1;
        IF NOT EXISTS (
            SELECT 1 FROM Usuario u INNER JOIN Rol r ON r.IdRol = u.IdRol
            WHERE u.IdUsuario = @IdVendedor AND u.Activo = 1 AND r.Nombre = 'Vendedor / Ejecutivo de cuenta')
            THROW 50001, N'El vendedor indicado está inactivo o no está disponible. Elija un vendedor activo.', 1;
        SET @Responsable = @IdVendedor;
    END;

    UPDATE Prospecto
    SET Estado = @EstadoInicial, IdVendedor = @Responsable, FechaActualizacion = SYSUTCDATETIME()
    WHERE IdProspecto = @IdProspecto;

    INSERT INTO ProspectoEstadoHistorial (IdProspecto, EstadoAnterior, EstadoNuevo, Motivo, Observacion, IdUsuario)
    VALUES (@IdProspecto, 'Descartado', @EstadoInicial, 'Reactivación del prospecto',
            CASE WHEN @MotivoDescarte IS NOT NULL THEN 'Motivo del descarte anterior: ' + @MotivoDescarte END, @IdUsuario);

    SELECT TOP 1 @IdContacto = ce.IdContactoEmpresa FROM ContactoEmpresa ce
    WHERE ce.IdProspecto = @IdProspecto AND ce.Activo = 1 AND ce.EsPrincipal = 1;

    INSERT INTO SeguimientoCRM (IdProspecto, IdContactoEmpresa, Tipo, FechaHora, FechaHoraOriginal, Motivo, Prioridad, IdResponsable, Estado, Origen, IdUsuarioCrea)
    VALUES (@IdProspecto, @IdContacto, 'Llamada', @FechaHoraSeguim, @FechaHoraSeguim, 'Seguimiento por reactivación del prospecto', 'Media',
            @Responsable, 'Pendiente', 'Prospecto', @IdUsuario);
    SET @IdSeguimiento = SCOPE_IDENTITY();

    INSERT INTO SeguimientoHistorial (IdSeguimiento, Accion, FechaHoraNueva, Motivo, IdUsuario)
    VALUES (@IdSeguimiento, 'Creado', @FechaHoraSeguim, 'Seguimiento por reactivación del prospecto', @IdUsuario);

    COMMIT TRANSACTION;

    SELECT 'Aplicado' AS Resultado, @EstadoInicial AS Estado, CAST(NULL AS INT) AS IdCliente, CAST(NULL AS VARCHAR(150)) AS ClienteEmpresa,
           @IdSeguimiento AS IdSeguimiento;
END
