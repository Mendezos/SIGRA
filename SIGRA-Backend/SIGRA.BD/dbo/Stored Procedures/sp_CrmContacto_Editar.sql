-- CRMGPSC-006: edita un contacto ACTIVO (la empresa no cambia). Devuelve los valores ANTERIORES (para la auditoría).
-- Un correo o teléfono que ya tiene otro contacto de la misma empresa rechaza el cambio (solo se revisan los datos que cambian).
-- Si se marca como principal y ya hay otro principal activo, exige @ConfirmarCambioPrincipal = 1 y le retira la marca al anterior.
CREATE PROCEDURE [dbo].[sp_CrmContacto_Editar]
    @IdContactoEmpresa       INT,
    @Nombre                  VARCHAR(150),
    @Cargo                   VARCHAR(100) = NULL,
    @Telefono                VARCHAR(20)  = NULL,
    @Correo                  VARCHAR(150) = NULL,
    @FechaCumpleanos         DATE         = NULL,
    @PreferenciaContacto     VARCHAR(20)  = 'Cualquiera',
    @EsPrincipal             BIT          = 0,
    @ConfirmarCambioPrincipal BIT         = 0,
    @IdUsuario               INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Bloqueo INT, @Recurso NVARCHAR(100), @Mensaje NVARCHAR(2000);
    DECLARE @IdProspecto INT, @IdCliente INT, @Tipo VARCHAR(10), @IdEmpresa INT, @Activo BIT, @EraPrincipal BIT;
    DECLARE @CorreoActual VARCHAR(150), @TelefonoActual VARCHAR(20), @IdPrincipal INT, @NombrePrincipal VARCHAR(150);
    DECLARE @Coincidencias TABLE (IdContactoEmpresa INT, Nombre VARCHAR(150), Cargo VARCHAR(100), Telefono VARCHAR(20), Correo VARCHAR(150),
                                  Activo BIT, EsPrincipal BIT, MotivoCoincidencia VARCHAR(60));
    DECLARE @Anterior TABLE (Nombre VARCHAR(150), Cargo VARCHAR(100), Telefono VARCHAR(20), Correo VARCHAR(150), FechaCumpleanos DATE,
                             PreferenciaContacto VARCHAR(20), EsPrincipal BIT);

    IF @FechaCumpleanos IS NOT NULL AND @FechaCumpleanos < '19000101'
        THROW 50001, N'La fecha de cumpleaños no puede ser anterior a 1900.', 1;
    IF @FechaCumpleanos IS NOT NULL AND @FechaCumpleanos > CONVERT(DATE, dbo.fn_CrmAhora())
        THROW 50001, N'La fecha de cumpleaños no puede ser futura.', 1;

    -- Primero se identifica la empresa (sin bloquear) para tomar el bloqueo de esa empresa antes de leer el contacto.
    SELECT @IdProspecto = IdProspecto, @IdCliente = IdCliente FROM ContactoEmpresa WHERE IdContactoEmpresa = @IdContactoEmpresa;
    IF @IdProspecto IS NULL AND @IdCliente IS NULL THROW 50001, N'El contacto indicado no existe.', 1;
    SET @Tipo = CASE WHEN @IdProspecto IS NOT NULL THEN 'Prospecto' ELSE 'Cliente' END;
    SET @IdEmpresa = ISNULL(@IdProspecto, @IdCliente);
    SET @Recurso = N'CrmContacto_' + @Tipo + N'_' + CAST(@IdEmpresa AS NVARCHAR(10));

    BEGIN TRANSACTION;

    EXEC @Bloqueo = sp_getapplock @Resource = @Recurso, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
    IF @Bloqueo < 0 THROW 50001, N'El sistema está ocupado actualizando los contactos de esta empresa. Intente nuevamente.', 1;

    SELECT @Activo = ce.Activo, @EraPrincipal = ce.EsPrincipal, @CorreoActual = ce.Correo, @TelefonoActual = ce.Telefono
    FROM ContactoEmpresa ce WITH (UPDLOCK, HOLDLOCK)
    WHERE ce.IdContactoEmpresa = @IdContactoEmpresa;

    IF @Activo IS NULL THROW 50001, N'El contacto indicado no existe.', 1;
    IF @Activo = 0 THROW 50001, N'El contacto está inactivo y no se puede editar. Reactívelo para modificar sus datos.', 1;

    DECLARE @CorreoNuevo   VARCHAR(150) = CASE WHEN @Correo IS NOT NULL AND @Correo COLLATE Latin1_General_CI_AI <> ISNULL(@CorreoActual, '') COLLATE Latin1_General_CI_AI THEN @Correo END;
    DECLARE @TelefonoNuevo VARCHAR(20)  = CASE WHEN @Telefono IS NOT NULL
                                                AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(@Telefono, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '')
                                                 <> REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(ISNULL(@TelefonoActual, ''), ' ', ''), '-', ''), '(', ''), ')', ''), '+', '')
                                               THEN @Telefono END;

    INSERT INTO @Coincidencias
    EXEC sp_CrmContacto_Coincidencias @Tipo = @Tipo, @IdEmpresa = @IdEmpresa, @Correo = @CorreoNuevo, @Telefono = @TelefonoNuevo, @ExcluirContacto = @IdContactoEmpresa;

    IF EXISTS (SELECT 1 FROM @Coincidencias)
    BEGIN
        SELECT TOP 1 @Mensaje = N'El dato ingresado ya pertenece al contacto «' + Nombre + N'» (CT-' + RIGHT('0000' + CAST(IdContactoEmpresa AS VARCHAR(10)), 4)
                              + N') de la misma empresa (' + MotivoCoincidencia + N'). Corrija el dato para guardar los cambios.'
        FROM @Coincidencias ORDER BY IdContactoEmpresa;
        THROW 50001, @Mensaje, 1;
    END;

    IF @EsPrincipal = 1 AND @EraPrincipal = 0
    BEGIN
        SELECT TOP 1 @IdPrincipal = ce.IdContactoEmpresa, @NombrePrincipal = ce.Nombre
        FROM ContactoEmpresa ce WITH (UPDLOCK)
        WHERE ((@Tipo = 'Prospecto' AND ce.IdProspecto = @IdEmpresa) OR (@Tipo = 'Cliente' AND ce.IdCliente = @IdEmpresa))
          AND ce.EsPrincipal = 1 AND ce.Activo = 1 AND ce.IdContactoEmpresa <> @IdContactoEmpresa;

        IF @IdPrincipal IS NOT NULL
        BEGIN
            IF ISNULL(@ConfirmarCambioPrincipal, 0) = 0
            BEGIN
                SET @Mensaje = N'Esta empresa ya tiene como contacto principal a «' + @NombrePrincipal + N'». Confirme el cambio para dejar a este contacto como principal.';
                THROW 50001, @Mensaje, 1;
            END;
            UPDATE ContactoEmpresa SET EsPrincipal = 0, FechaActualizacion = SYSUTCDATETIME() WHERE IdContactoEmpresa = @IdPrincipal;
        END;
    END;

    UPDATE ContactoEmpresa
    SET Nombre = @Nombre, Cargo = @Cargo, Telefono = @Telefono, Correo = @Correo, FechaCumpleanos = @FechaCumpleanos,
        PreferenciaContacto = ISNULL(@PreferenciaContacto, 'Cualquiera'), EsPrincipal = ISNULL(@EsPrincipal, 0), FechaActualizacion = SYSUTCDATETIME()
    OUTPUT deleted.Nombre, deleted.Cargo, deleted.Telefono, deleted.Correo, deleted.FechaCumpleanos, deleted.PreferenciaContacto, deleted.EsPrincipal
    INTO @Anterior
    WHERE IdContactoEmpresa = @IdContactoEmpresa;

    COMMIT TRANSACTION;

    SELECT Nombre, Cargo, Telefono, Correo, FechaCumpleanos, PreferenciaContacto, EsPrincipal FROM @Anterior;
END
