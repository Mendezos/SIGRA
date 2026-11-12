-- CRMGPSC-019: convierte un prospecto en cliente (o lo vincula a un cliente que ya existe) y conserva su historial comercial:
-- contactos, cotizaciones, notas, interacciones, seguimientos y series de contacto pasan al cliente. Todo en una transacción.
-- Devuelve IdCliente y el aviso a los administradores (coordinación de ventas) con prospecto, cliente, vendedor, fecha y venta inicial.
CREATE PROCEDURE [dbo].[sp_CrmProspecto_Convertir]
    @IdProspecto       INT,
    @IdUsuario         INT,
    @IdClienteExistente INT = NULL,
    @Producto          VARCHAR(200),
    @Cantidad          INT,
    @Monto             DECIMAL(14, 2),
    @Moneda            CHAR(3),
    @Fecha             DATE
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Estado VARCHAR(30), @Empresa VARCHAR(150), @Contacto VARCHAR(150), @Correo VARCHAR(150), @Telefono VARCHAR(20),
            @Sector VARCHAR(100), @Direccion VARCHAR(300), @Flota INT, @IdVendedor INT, @IdCliente INT, @VendedorNombre VARCHAR(150);

    BEGIN TRANSACTION;

    SELECT @Estado = p.Estado, @Empresa = p.Empresa, @Contacto = p.Contacto, @Correo = p.Correo, @Telefono = p.Telefono, @Sector = p.Sector,
           @Direccion = p.Direccion, @Flota = p.TamanoFlota, @IdVendedor = p.IdVendedor
    FROM Prospecto p WITH (UPDLOCK) WHERE p.IdProspecto = @IdProspecto;

    IF @Estado IS NULL THROW 50001, 'El prospecto indicado no existe.', 1;
    IF @Estado = 'Convertido' THROW 50001, 'El prospecto ya fue convertido en cliente.', 1;
    IF @Estado = 'Descartado' THROW 50001, 'El prospecto está descartado: reactívelo antes de convertirlo en cliente.', 1;

    IF @IdClienteExistente IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM Cliente WHERE IdCliente = @IdClienteExistente)
            THROW 50001, 'El cliente con el que se quiere vincular no existe.', 1;
        SET @IdCliente = @IdClienteExistente;
        -- Si el cliente no tenía vendedor responsable se le deja el del prospecto.
        UPDATE Cliente SET IdVendedor = COALESCE(IdVendedor, @IdVendedor) WHERE IdCliente = @IdCliente;
    END
    ELSE
    BEGIN
        INSERT INTO Cliente (Empresa, Contacto, Correo, Telefono, Sector, Direccion, TamanoFlota, IdVendedor)
        VALUES (@Empresa, @Contacto, @Correo, @Telefono, @Sector, @Direccion, @Flota, @IdVendedor);
        SET @IdCliente = SCOPE_IDENTITY();
    END

    -- Un cliente solo puede tener un contacto principal activo: si ya lo tiene, los contactos que llegan quedan como no principales.
    DECLARE @TienePrincipal BIT = CASE WHEN EXISTS (SELECT 1 FROM ContactoEmpresa WHERE IdCliente = @IdCliente AND EsPrincipal = 1 AND Activo = 1) THEN 1 ELSE 0 END;
    UPDATE ContactoEmpresa
    SET IdCliente = @IdCliente, IdProspecto = NULL,
        EsPrincipal = CASE WHEN @TienePrincipal = 1 THEN 0 ELSE EsPrincipal END
    WHERE IdProspecto = @IdProspecto;

    UPDATE Cotizacion    SET IdCliente = @IdCliente, IdProspecto = NULL WHERE IdProspecto = @IdProspecto;
    UPDATE NotaCRM       SET IdCliente = @IdCliente, IdProspecto = NULL WHERE IdProspecto = @IdProspecto;
    UPDATE InteraccionCRM SET IdCliente = @IdCliente, IdProspecto = NULL WHERE IdProspecto = @IdProspecto;
    UPDATE SeguimientoCRM SET IdCliente = @IdCliente, IdProspecto = NULL WHERE IdProspecto = @IdProspecto;
    UPDATE SerieContactoCRM SET IdCliente = @IdCliente, IdProspecto = NULL WHERE IdProspecto = @IdProspecto;

    UPDATE Prospecto
    SET Estado = 'Convertido', IdCliente = @IdCliente, FechaConversion = SYSUTCDATETIME(), FechaActualizacion = SYSUTCDATETIME()
    WHERE IdProspecto = @IdProspecto;

    INSERT INTO ProspectoEstadoHistorial (IdProspecto, EstadoAnterior, EstadoNuevo, Motivo, Observacion, IdUsuario)
    VALUES (@IdProspecto, @Estado, 'Convertido', 'Convertido en cliente',
            CASE WHEN @IdClienteExistente IS NULL THEN 'Se creó el cliente CL-' ELSE 'Se vinculó con el cliente CL-' END + RIGHT('0000' + CAST(@IdCliente AS VARCHAR(10)), 4), @IdUsuario);

    INSERT INTO ClienteVentaInicial (IdCliente, IdProspecto, Producto, Cantidad, Monto, Moneda, Fecha, IdUsuario)
    VALUES (@IdCliente, @IdProspecto, @Producto, @Cantidad, @Monto, @Moneda, @Fecha, @IdUsuario);

    -- Aviso a la coordinación de ventas (administradores)
    SELECT @VendedorNombre = Nombre FROM Usuario WHERE IdUsuario = @IdVendedor;
    DECLARE @Titulo NVARCHAR(200) = N'Prospecto convertido en cliente: ' + @Empresa;
    DECLARE @Mensaje NVARCHAR(MAX) = N'Prospecto PR-' + RIGHT('0000' + CAST(@IdProspecto AS VARCHAR(10)), 4) + N' → cliente CL-' + RIGHT('0000' + CAST(@IdCliente AS VARCHAR(10)), 4)
        + N'. Vendedor: ' + ISNULL(@VendedorNombre, N'sin asignar') + N'. Fecha: ' + CONVERT(NVARCHAR(10), @Fecha, 103)
        + N'. Venta inicial: ' + CAST(@Cantidad AS NVARCHAR(10)) + N' × ' + @Producto + N' por ' + @Moneda + N' ' + CONVERT(NVARCHAR(30), @Monto) + N'.';
    DECLARE @Admin INT;
    DECLARE admins CURSOR LOCAL FAST_FORWARD FOR
        SELECT u.IdUsuario FROM Usuario u INNER JOIN Rol r ON r.IdRol = u.IdRol
        WHERE u.Activo = 1 AND r.Activo = 1 AND u.IdCliente IS NULL AND r.Nombre = 'Administrador del sistema';
    OPEN admins; FETCH NEXT FROM admins INTO @Admin;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC sp_Notificacion_Registrar @IdUsuario = @Admin, @IdModulo = 9, @Titulo = @Titulo, @Mensaje = @Mensaje, @Entidad = N'Cliente', @IdEntidad = @IdCliente, @Tipo = 'General';
        FETCH NEXT FROM admins INTO @Admin;
    END
    CLOSE admins; DEALLOCATE admins;

    COMMIT TRANSACTION;

    SELECT @IdCliente AS IdCliente;
END
