-- Crea una serie de contactos periódicos y sus seguimientos individuales (CRMGPSC-024). Devuelve el IdSerie.
-- Las mismas reglas de empresa, contacto y responsable que sp_CrmSeguimiento_Crear; la fecha inicial más la hora (hora de
-- Costa Rica) no pueden haber pasado.
-- Genera las ocurrencias idx = 0, 1, 2... con fecha dbo.fn_CrmSerie_Fecha(@FechaInicial, @Periodicidad, idx) mientras la fecha
-- sea menor que @FechaInicial + 12 meses (Mensual = 12, Trimestral = 4, Semestral = 2). Cada una es un seguimiento
-- con Origen = 'Serie', su propio identificador y su fila "Creado" en el historial. OcurrenciasGeneradas guarda el índice de la
-- próxima ocurrencia por generar: el servicio de recordatorios extiende la serie con esa misma regla.
CREATE PROCEDURE [dbo].[sp_CrmSerie_Crear]
    @TipoEmpresa       VARCHAR(10),
    @IdEmpresa         INT,
    @IdContactoEmpresa INT = NULL,
    @Periodicidad      VARCHAR(15),
    @FechaInicial      DATE,
    @Hora              TIME(0),
    @Tipo              VARCHAR(20),
    @Motivo            VARCHAR(500),
    @Prioridad         VARCHAR(10) = 'Media',
    @IdResponsable     INT,
    @IdUsuario         INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IdProspecto INT, @IdCliente INT, @Activa BIT, @ContactoActivo BIT, @IdSerie INT, @Generadas INT;
    DECLARE @Segundos INT = DATEDIFF(SECOND, CAST('00:00:00' AS TIME(0)), @Hora);
    DECLARE @Nuevos TABLE (IdSeguimiento INT NOT NULL, FechaHora DATETIME2(0) NOT NULL);

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
        THROW 50001, N'La empresa indicada no está activa: solo se programan contactos periódicos para prospectos en gestión o clientes activos.', 1;

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

    IF DATEADD(SECOND, @Segundos, CAST(@FechaInicial AS DATETIME2(0))) <= dbo.fn_CrmAhora()
        THROW 50001, N'La fecha y hora iniciales ya pasaron; ingrese una fecha actual o futura y una hora que no haya pasado.', 1;

    INSERT SerieContactoCRM (IdProspecto, IdCliente, IdContactoEmpresa, Periodicidad, FechaInicial, Hora, Tipo, Motivo, Prioridad,
                             IdResponsable, Estado, OcurrenciasGeneradas, IdUsuarioCrea)
    VALUES (@IdProspecto, @IdCliente, @IdContactoEmpresa, @Periodicidad, @FechaInicial, @Hora, @Tipo, @Motivo, @Prioridad,
            @IdResponsable, 'Activa', 0, @IdUsuario);
    SET @IdSerie = SCOPE_IDENTITY();

    INSERT SeguimientoCRM (IdProspecto, IdCliente, IdContactoEmpresa, Tipo, FechaHora, FechaHoraOriginal, Motivo, Prioridad,
                           IdResponsable, Estado, Origen, IdSerie, IdUsuarioCrea)
    OUTPUT inserted.IdSeguimiento, inserted.FechaHora INTO @Nuevos (IdSeguimiento, FechaHora)
    SELECT @IdProspecto, @IdCliente, @IdContactoEmpresa, @Tipo, f.FechaHora, f.FechaHora, @Motivo, @Prioridad,
           @IdResponsable, 'Pendiente', 'Serie', @IdSerie, @IdUsuario
    FROM (VALUES (0), (1), (2), (3), (4), (5), (6), (7), (8), (9), (10), (11), (12)) v (Idx)
    CROSS APPLY (SELECT DATEADD(SECOND, @Segundos, CAST(dbo.fn_CrmSerie_Fecha(@FechaInicial, @Periodicidad, v.Idx) AS DATETIME2(0))) AS FechaHora,
                        dbo.fn_CrmSerie_Fecha(@FechaInicial, @Periodicidad, v.Idx) AS Fecha) f
    WHERE f.Fecha < DATEADD(MONTH, 12, @FechaInicial)
    ORDER BY v.Idx;
    SET @Generadas = @@ROWCOUNT;

    INSERT SeguimientoHistorial (IdSeguimiento, Accion, FechaHoraNueva, Motivo, IdUsuario)
    SELECT IdSeguimiento, 'Creado', FechaHora, @Motivo, @IdUsuario FROM @Nuevos;

    UPDATE SerieContactoCRM SET OcurrenciasGeneradas = @Generadas WHERE IdSerie = @IdSerie;

    COMMIT TRANSACTION;

    SELECT @IdSerie AS IdSerie;
END
