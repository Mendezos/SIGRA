-- CRMGPSC-005: registra una persona de contacto de un prospecto o cliente. Devuelve IdContactoEmpresa.
-- Rechaza: empresa inexistente o prospecto Descartado/Convertido, correo o teléfono repetido dentro de la misma empresa y fecha de cumpleaños
-- futura o anterior a 1900. Si se marca como principal y ya hay otro principal activo, exige @ConfirmarCambioPrincipal = 1 y le retira la marca al anterior.
CREATE PROCEDURE [dbo].[sp_CrmContacto_Insertar]
    @Tipo                    VARCHAR(10),
    @IdEmpresa               INT,
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

    DECLARE @Bloqueo INT, @Recurso NVARCHAR(100) = N'CrmContacto_' + @Tipo + N'_' + CAST(@IdEmpresa AS NVARCHAR(10));
    DECLARE @EstadoEmpresa VARCHAR(30), @IdNuevo INT, @IdPrincipal INT, @NombrePrincipal VARCHAR(150), @Mensaje NVARCHAR(2000);
    DECLARE @Coincidencias TABLE (IdContactoEmpresa INT, Nombre VARCHAR(150), Cargo VARCHAR(100), Telefono VARCHAR(20), Correo VARCHAR(150),
                                  Activo BIT, EsPrincipal BIT, MotivoCoincidencia VARCHAR(60));

    IF @FechaCumpleanos IS NOT NULL AND @FechaCumpleanos < '19000101'
        THROW 50001, N'La fecha de cumpleaños no puede ser anterior a 1900.', 1;
    IF @FechaCumpleanos IS NOT NULL AND @FechaCumpleanos > CONVERT(DATE, dbo.fn_CrmAhora())
        THROW 50001, N'La fecha de cumpleaños no puede ser futura.', 1;

    BEGIN TRANSACTION;

    EXEC @Bloqueo = sp_getapplock @Resource = @Recurso, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
    IF @Bloqueo < 0 THROW 50001, N'El sistema está ocupado actualizando los contactos de esta empresa. Intente nuevamente.', 1;

    IF @Tipo = 'Prospecto'
        SELECT @EstadoEmpresa = Estado FROM Prospecto WHERE IdProspecto = @IdEmpresa;
    ELSE IF @Tipo = 'Cliente'
        SELECT @EstadoEmpresa = 'Cliente' FROM Cliente WHERE IdCliente = @IdEmpresa;

    IF @EstadoEmpresa IS NULL THROW 50001, N'La empresa indicada no existe.', 1;
    IF @EstadoEmpresa IN ('Convertido', 'Descartado')
        THROW 50001, N'No se pueden registrar contactos en un prospecto descartado o convertido en cliente.', 1;

    INSERT INTO @Coincidencias
    EXEC sp_CrmContacto_Coincidencias @Tipo = @Tipo, @IdEmpresa = @IdEmpresa, @Correo = @Correo, @Telefono = @Telefono;

    IF EXISTS (SELECT 1 FROM @Coincidencias)
    BEGIN
        SELECT TOP 1 @Mensaje = N'Esta empresa ya tiene al contacto «' + Nombre + N'» (CT-' + RIGHT('0000' + CAST(IdContactoEmpresa AS VARCHAR(10)), 4)
                              + N') con ' + REPLACE(MotivoCoincidencia, 'mismo', 'el mismo') + N'. Abra el contacto existente.'
        FROM @Coincidencias ORDER BY IdContactoEmpresa;
        THROW 50001, @Mensaje, 1;
    END;

    IF @EsPrincipal = 1
    BEGIN
        SELECT TOP 1 @IdPrincipal = ce.IdContactoEmpresa, @NombrePrincipal = ce.Nombre
        FROM ContactoEmpresa ce WITH (UPDLOCK)
        WHERE ((@Tipo = 'Prospecto' AND ce.IdProspecto = @IdEmpresa) OR (@Tipo = 'Cliente' AND ce.IdCliente = @IdEmpresa))
          AND ce.EsPrincipal = 1 AND ce.Activo = 1;

        IF @IdPrincipal IS NOT NULL
        BEGIN
            IF ISNULL(@ConfirmarCambioPrincipal, 0) = 0
            BEGIN
                SET @Mensaje = N'Esta empresa ya tiene como contacto principal a «' + @NombrePrincipal + N'». Confirme el cambio para dejar al nuevo contacto como principal.';
                THROW 50001, @Mensaje, 1;
            END;
            UPDATE ContactoEmpresa SET EsPrincipal = 0, FechaActualizacion = SYSUTCDATETIME() WHERE IdContactoEmpresa = @IdPrincipal;
        END;
    END;

    INSERT INTO ContactoEmpresa (IdProspecto, IdCliente, Nombre, Cargo, Telefono, Correo, FechaCumpleanos, PreferenciaContacto, EsPrincipal, IdUsuarioCrea)
    VALUES (CASE WHEN @Tipo = 'Prospecto' THEN @IdEmpresa END, CASE WHEN @Tipo = 'Cliente' THEN @IdEmpresa END,
            @Nombre, @Cargo, @Telefono, @Correo, @FechaCumpleanos, ISNULL(@PreferenciaContacto, 'Cualquiera'), ISNULL(@EsPrincipal, 0), @IdUsuario);
    SET @IdNuevo = SCOPE_IDENTITY();

    COMMIT TRANSACTION;

    SELECT @IdNuevo AS IdContactoEmpresa;
END
