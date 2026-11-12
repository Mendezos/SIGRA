-- CRMGPSC-003: edita los datos de un prospecto que no esté Convertido ni Descartado.
-- Un correo, teléfono o nombre de empresa que coincide con OTRO prospecto o cliente bloquea el cambio (solo se revisan los datos que cambian,
-- para no impedir editar un prospecto que se registró como duplicado con justificación).
-- @IdVendedor en NULL conserva al responsable; si se cambia, el nuevo debe ser un vendedor activo.
-- Devuelve los valores ANTERIORES (para la auditoría).
CREATE PROCEDURE [dbo].[sp_CrmProspecto_Editar]
    @IdProspecto  INT,
    @Empresa      VARCHAR(150),
    @Contacto     VARCHAR(150) = NULL,
    @Correo       VARCHAR(150) = NULL,
    @Telefono     VARCHAR(20)  = NULL,
    @Sector       VARCHAR(100) = NULL,
    @Direccion    VARCHAR(300) = NULL,
    @TamanoFlota  INT          = NULL,
    @Fuente       VARCHAR(100) = NULL,
    @IdVendedor   INT          = NULL,
    @IdUsuario    INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Bloqueo INT, @Estado VARCHAR(30), @IdCliente INT, @ClienteEmpresa VARCHAR(150), @VendedorActual INT;
    DECLARE @EmpresaActual VARCHAR(150), @CorreoActual VARCHAR(150), @TelefonoActual VARCHAR(20);
    DECLARE @Mensaje NVARCHAR(2000);
    DECLARE @Coincidencias TABLE (Tipo VARCHAR(10), IdEmpresa INT, Empresa VARCHAR(150), MotivoCoincidencia VARCHAR(100), Estado VARCHAR(30));
    DECLARE @Anterior TABLE (Empresa VARCHAR(150), Contacto VARCHAR(150), Correo VARCHAR(150), Telefono VARCHAR(20), Sector VARCHAR(100),
                             Direccion VARCHAR(300), TamanoFlota INT, Fuente VARCHAR(100), IdVendedor INT);

    BEGIN TRANSACTION;

    EXEC @Bloqueo = sp_getapplock @Resource = N'CrmProspecto_Duplicados', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
    IF @Bloqueo < 0 THROW 50001, N'El sistema está ocupado actualizando otro prospecto. Intente nuevamente.', 1;

    SELECT @Estado = p.Estado, @IdCliente = p.IdCliente, @VendedorActual = p.IdVendedor,
           @EmpresaActual = p.Empresa, @CorreoActual = p.Correo, @TelefonoActual = p.Telefono
    FROM Prospecto p WITH (UPDLOCK, HOLDLOCK)
    WHERE p.IdProspecto = @IdProspecto;

    IF @Estado IS NULL THROW 50001, N'El prospecto indicado no existe.', 1;

    IF @Estado = 'Convertido'
    BEGIN
        SELECT @ClienteEmpresa = Empresa FROM Cliente WHERE IdCliente = @IdCliente;
        SET @Mensaje = N'El prospecto ya fue convertido en cliente y no se puede editar.'
            + ISNULL(N' Abra el cliente vinculado «' + @ClienteEmpresa + N'».', N'');
        THROW 50001, @Mensaje, 1;
    END;
    IF @Estado = 'Descartado'
        THROW 50001, N'El prospecto está descartado y no se puede editar. Reactívelo para modificar sus datos.', 1;

    IF @IdVendedor IS NOT NULL AND ISNULL(@VendedorActual, 0) <> @IdVendedor
       AND NOT EXISTS (SELECT 1 FROM Usuario u INNER JOIN Rol r ON r.IdRol = u.IdRol
                       WHERE u.IdUsuario = @IdVendedor AND u.Activo = 1 AND r.Nombre = 'Vendedor / Ejecutivo de cuenta')
        THROW 50001, N'El vendedor responsable está inactivo o no está disponible. Seleccione un vendedor activo.', 1;

    -- Solo se revisan los datos que cambian.
    DECLARE @EmpresaNueva  VARCHAR(150) = CASE WHEN @Empresa COLLATE Latin1_General_CI_AI <> @EmpresaActual COLLATE Latin1_General_CI_AI THEN @Empresa END;
    DECLARE @CorreoNuevo   VARCHAR(150) = CASE WHEN @Correo IS NOT NULL AND @Correo COLLATE Latin1_General_CI_AI <> ISNULL(@CorreoActual, '') COLLATE Latin1_General_CI_AI THEN @Correo END;
    DECLARE @TelefonoNuevo VARCHAR(20)  = CASE WHEN @Telefono IS NOT NULL
                                                AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(@Telefono, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '')
                                                 <> REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(ISNULL(@TelefonoActual, ''), ' ', ''), '-', ''), '(', ''), ')', ''), '+', '')
                                               THEN @Telefono END;

    INSERT INTO @Coincidencias
    EXEC sp_CrmProspecto_Coincidencias @Empresa = @EmpresaNueva, @Correo = @CorreoNuevo, @Telefono = @TelefonoNuevo, @ExcluirProspecto = @IdProspecto;

    IF EXISTS (SELECT 1 FROM @Coincidencias)
    BEGIN
        SELECT @Mensaje = N'Los datos ingresados coinciden con otro registro: '
            + STRING_AGG(CAST(CASE WHEN c.Tipo = 'Prospecto' THEN N'prospecto PR-' + RIGHT('0000' + CAST(c.IdEmpresa AS VARCHAR(10)), 4) ELSE N'cliente' END
                              + N' «' + c.Empresa + N'» (' + c.MotivoCoincidencia + N')' AS NVARCHAR(400)), N'; ')
            + N'. Corrija los datos o abra el registro existente: el cambio no se aplica mientras exista la duplicidad.'
        FROM @Coincidencias c;
        THROW 50001, @Mensaje, 1;
    END;

    UPDATE Prospecto
    SET Empresa = @Empresa, Contacto = @Contacto, Correo = @Correo, Telefono = @Telefono, Sector = @Sector, Direccion = @Direccion,
        TamanoFlota = @TamanoFlota, Fuente = @Fuente, IdVendedor = ISNULL(@IdVendedor, IdVendedor),
        FechaActualizacion = SYSUTCDATETIME()
    OUTPUT deleted.Empresa, deleted.Contacto, deleted.Correo, deleted.Telefono, deleted.Sector, deleted.Direccion,
           deleted.TamanoFlota, deleted.Fuente, deleted.IdVendedor
    INTO @Anterior
    WHERE IdProspecto = @IdProspecto;

    COMMIT TRANSACTION;

    SELECT a.Empresa, a.Contacto, a.Correo, a.Telefono, a.Sector, a.Direccion, a.TamanoFlota, a.Fuente, a.IdVendedor, v.Nombre AS Vendedor
    FROM @Anterior a
    LEFT JOIN Usuario v ON v.IdUsuario = a.IdVendedor;
END
