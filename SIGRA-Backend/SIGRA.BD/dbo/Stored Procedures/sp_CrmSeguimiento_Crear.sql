-- Programa un seguimiento manual (CRMGPSC-015). Devuelve el IdSeguimiento creado.
-- Reglas: la empresa debe ser un prospecto en gestión o un cliente activo; el contacto (opcional) debe ser de esa empresa y
-- estar activo; el responsable debe ser un vendedor activo; la fecha y hora (hora de Costa Rica) deben ser futuras.
-- El seguimiento nace Pendiente, con FechaHoraOriginal = FechaHora, y deja la fila "Creado" en el historial.
-- La alerta de la fecha programada la genera el servicio de recordatorios (FechaAlerta NULL = aún sin avisar).
CREATE PROCEDURE [dbo].[sp_CrmSeguimiento_Crear]
    @TipoEmpresa       VARCHAR(10),
    @IdEmpresa         INT,
    @IdContactoEmpresa INT = NULL,
    @Tipo              VARCHAR(20),
    @FechaHora         DATETIME2(0),
    @Motivo            VARCHAR(500),
    @Prioridad         VARCHAR(10) = 'Media',
    @IdResponsable     INT,
    @IdUsuario         INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IdProspecto INT, @IdCliente INT, @Activa BIT, @ContactoActivo BIT, @IdSeguimiento INT;

    BEGIN TRANSACTION;

    IF @TipoEmpresa = 'Prospecto'
        SELECT @IdProspecto = p.IdProspecto, @Activa = CASE WHEN p.Estado IN ('Convertido', 'Descartado') THEN 0 ELSE 1 END
        FROM Prospecto p WITH (UPDLOCK, ROWLOCK) WHERE p.IdProspecto = @IdEmpresa;
    ELSE IF @TipoEmpresa = 'Cliente'
        SELECT @IdCliente = c.IdCliente, @Activa = c.Activo
        FROM Cliente c WITH (UPDLOCK, ROWLOCK) WHERE c.IdCliente = @IdEmpresa;
    ELSE
        THROW 50001, N'El tipo de empresa debe ser Prospecto o Cliente.', 1;

    IF @IdProspecto IS NULL AND @IdCliente IS NULL
        THROW 50001, N'La empresa indicada no existe.', 1;

    IF @Activa = 0
        THROW 50001, N'La empresa indicada no está activa: solo se programan seguimientos para prospectos en gestión o clientes activos.', 1;

    IF @IdContactoEmpresa IS NOT NULL
    BEGIN
        SELECT @ContactoActivo = ce.Activo
        FROM ContactoEmpresa ce
        WHERE ce.IdContactoEmpresa = @IdContactoEmpresa
          AND ((@IdProspecto IS NOT NULL AND ce.IdProspecto = @IdProspecto) OR (@IdCliente IS NOT NULL AND ce.IdCliente = @IdCliente));

        IF @ContactoActivo IS NULL
            THROW 50001, N'El contacto seleccionado no pertenece a la empresa indicada.', 1;
        IF @ContactoActivo = 0
            THROW 50001, N'El contacto seleccionado está inactivo; elija un contacto activo.', 1;
    END

    IF NOT EXISTS (SELECT 1 FROM Usuario u INNER JOIN Rol r ON r.IdRol = u.IdRol
                   WHERE u.IdUsuario = @IdResponsable AND u.Activo = 1 AND r.Nombre = 'Vendedor / Ejecutivo de cuenta')
        THROW 50001, N'El responsable seleccionado está inactivo o no es un vendedor; elija a otro vendedor.', 1;

    IF @FechaHora <= dbo.fn_CrmAhora()
        THROW 50001, N'La fecha y hora del seguimiento ya pasaron; ingrese una fecha y hora futuras.', 1;

    INSERT SeguimientoCRM (IdProspecto, IdCliente, IdContactoEmpresa, Tipo, FechaHora, FechaHoraOriginal, Motivo, Prioridad,
                           IdResponsable, Estado, Origen, IdUsuarioCrea)
    VALUES (@IdProspecto, @IdCliente, @IdContactoEmpresa, @Tipo, @FechaHora, @FechaHora, @Motivo, @Prioridad,
            @IdResponsable, 'Pendiente', 'Manual', @IdUsuario);
    SET @IdSeguimiento = SCOPE_IDENTITY();

    INSERT SeguimientoHistorial (IdSeguimiento, Accion, FechaHoraNueva, Motivo, IdUsuario)
    VALUES (@IdSeguimiento, 'Creado', @FechaHora, @Motivo, @IdUsuario);

    COMMIT TRANSACTION;

    SELECT @IdSeguimiento AS IdSeguimiento;
END
