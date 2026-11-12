-- CRMGPSC-020: asigna o reasigna el vendedor responsable de un prospecto o de un cliente.
-- Si el vendedor es el mismo que ya tiene, no se crea un movimiento (Cambio = 0). Al reasignar, los seguimientos pendientes del
-- responsable anterior sobre ese registro pasan al nuevo y el movimiento queda en el historial.
CREATE PROCEDURE [dbo].[sp_CrmResponsable_Asignar]
    @Tipo        VARCHAR(10),      -- 'Prospecto' | 'Cliente'
    @IdEmpresa   INT,
    @IdVendedor  INT,
    @Motivo      VARCHAR(300) = NULL,
    @IdUsuario   INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Anterior INT, @Nombre VARCHAR(150), @Movidos INT = 0, @Titulo NVARCHAR(200), @Mensaje NVARCHAR(MAX), @Existe BIT = 0;

    IF @Tipo NOT IN ('Prospecto', 'Cliente') THROW 50001, 'El tipo de registro no es válido.', 1;

    IF NOT EXISTS (SELECT 1 FROM Usuario u INNER JOIN Rol r ON r.IdRol = u.IdRol
                   WHERE u.IdUsuario = @IdVendedor AND u.Activo = 1 AND r.Activo = 1 AND r.Nombre = 'Vendedor / Ejecutivo de cuenta')
        THROW 50001, 'El vendedor seleccionado está inactivo o no es un vendedor. Elija un vendedor activo.', 1;

    BEGIN TRANSACTION;

    IF @Tipo = 'Prospecto'
        SELECT @Anterior = IdVendedor, @Nombre = Empresa, @Existe = 1 FROM Prospecto WITH (UPDLOCK) WHERE IdProspecto = @IdEmpresa;
    ELSE
        SELECT @Anterior = IdVendedor, @Nombre = Empresa, @Existe = 1 FROM Cliente WITH (UPDLOCK) WHERE IdCliente = @IdEmpresa;

    IF @Existe = 0 THROW 50001, 'El registro indicado no existe.', 1;

    IF @Anterior = @IdVendedor
    BEGIN
        COMMIT TRANSACTION;
        SELECT CAST(0 AS BIT) AS Cambio, @Anterior AS IdVendedorAnterior, 0 AS SeguimientosMovidos;
        RETURN;
    END

    IF @Tipo = 'Prospecto'
    BEGIN
        UPDATE Prospecto SET IdVendedor = @IdVendedor, FechaActualizacion = SYSUTCDATETIME() WHERE IdProspecto = @IdEmpresa;
        IF @Anterior IS NOT NULL
        BEGIN
            UPDATE SeguimientoCRM SET IdResponsable = @IdVendedor
            WHERE IdProspecto = @IdEmpresa AND IdResponsable = @Anterior AND Estado IN ('Pendiente', 'Atrasado');
            SET @Movidos = @@ROWCOUNT;
        END
        INSERT INTO ResponsableComercialHistorial (IdProspecto, IdVendedorAnterior, IdVendedorNuevo, Motivo, SeguimientosMovidos, IdUsuario)
        VALUES (@IdEmpresa, @Anterior, @IdVendedor, @Motivo, @Movidos, @IdUsuario);
    END
    ELSE
    BEGIN
        UPDATE Cliente SET IdVendedor = @IdVendedor WHERE IdCliente = @IdEmpresa;
        IF @Anterior IS NOT NULL
        BEGIN
            UPDATE SeguimientoCRM SET IdResponsable = @IdVendedor
            WHERE IdCliente = @IdEmpresa AND IdResponsable = @Anterior AND Estado IN ('Pendiente', 'Atrasado');
            SET @Movidos = @@ROWCOUNT;
        END
        INSERT INTO ResponsableComercialHistorial (IdCliente, IdVendedorAnterior, IdVendedorNuevo, Motivo, SeguimientosMovidos, IdUsuario)
        VALUES (@IdEmpresa, @Anterior, @IdVendedor, @Motivo, @Movidos, @IdUsuario);
    END

    SET @Titulo = CASE WHEN @Anterior IS NULL THEN N'Se te asignó ' ELSE N'Se te reasignó ' END + LOWER(@Tipo) + N': ' + @Nombre;
    SET @Mensaje = N'Ahora eres el responsable comercial de ' + @Nombre + N'.' + CASE WHEN @Movidos > 0 THEN N' Se trasladaron ' + CAST(@Movidos AS NVARCHAR(10)) + N' seguimiento(s) pendiente(s).' ELSE N'' END;
    EXEC sp_Notificacion_Registrar @IdUsuario = @IdVendedor, @IdModulo = 9, @Titulo = @Titulo, @Mensaje = @Mensaje, @Entidad = @Tipo, @IdEntidad = @IdEmpresa, @Tipo = 'General';

    IF @Anterior IS NOT NULL
    BEGIN
        SET @Titulo = N'Reasignación de ' + LOWER(@Tipo) + N': ' + @Nombre;
        SET @Mensaje = N'Ya no eres el responsable comercial de ' + @Nombre + N'. Sus seguimientos pendientes pasaron al nuevo responsable.';
        EXEC sp_Notificacion_Registrar @IdUsuario = @Anterior, @IdModulo = 9, @Titulo = @Titulo, @Mensaje = @Mensaje, @Entidad = @Tipo, @IdEntidad = @IdEmpresa, @Tipo = 'General';
    END

    COMMIT TRANSACTION;

    SELECT CAST(1 AS BIT) AS Cambio, @Anterior AS IdVendedorAnterior, @Movidos AS SeguimientosMovidos;
END
