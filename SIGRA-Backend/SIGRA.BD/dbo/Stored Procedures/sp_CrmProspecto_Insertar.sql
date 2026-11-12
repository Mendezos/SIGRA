-- CRMGPSC-001: registra un prospecto nuevo (estado "Nuevo", fecha de ingreso = hoy en Costa Rica) y su primer movimiento de estado.
-- Si hay coincidencias (mismo correo, teléfono o nombre) y no se confirmó el duplicado, no lo registra. Devuelve IdProspecto.
CREATE PROCEDURE [dbo].[sp_CrmProspecto_Insertar]
    @Empresa                 VARCHAR(150),
    @Contacto                VARCHAR(150) = NULL,
    @Correo                  VARCHAR(150) = NULL,
    @Telefono                VARCHAR(20)  = NULL,
    @Sector                  VARCHAR(100) = NULL,
    @Direccion               VARCHAR(300) = NULL,
    @TamanoFlota             INT          = NULL,
    @Fuente                  VARCHAR(100) = NULL,
    @IdVendedor              INT,
    @ConfirmarDuplicado      BIT          = 0,
    @JustificacionDuplicado  VARCHAR(300) = NULL,
    @IdUsuario               INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IdProspecto INT, @Bloqueo INT, @Hoy DATE = CONVERT(DATE, dbo.fn_CrmAhora());
    DECLARE @Coincidencias TABLE (Tipo VARCHAR(10), IdEmpresa INT, Empresa VARCHAR(150), MotivoCoincidencia VARCHAR(100), Estado VARCHAR(30));

    BEGIN TRANSACTION;

    -- Una sola alta o edición a la vez: así dos registros simultáneos no se saltan la validación de duplicados.
    EXEC @Bloqueo = sp_getapplock @Resource = N'CrmProspecto_Duplicados', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
    IF @Bloqueo < 0 THROW 50001, N'El sistema está ocupado registrando otro prospecto. Intente nuevamente.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM Usuario u INNER JOIN Rol r ON r.IdRol = u.IdRol
        WHERE u.IdUsuario = @IdVendedor AND u.Activo = 1 AND r.Nombre = 'Vendedor / Ejecutivo de cuenta')
        THROW 50001, N'El vendedor responsable está inactivo o no está disponible. Seleccione un vendedor activo.', 1;

    INSERT INTO @Coincidencias EXEC sp_CrmProspecto_Coincidencias @Empresa = @Empresa, @Correo = @Correo, @Telefono = @Telefono;

    IF EXISTS (SELECT 1 FROM @Coincidencias) AND ISNULL(@ConfirmarDuplicado, 0) = 0
        THROW 50001, N'Ya existe un prospecto o cliente con el mismo correo, teléfono o nombre de empresa. Confirme el duplicado con una justificación o abra el registro existente.', 1;

    INSERT INTO Prospecto (Empresa, Contacto, Correo, Telefono, Estado, Sector, Direccion, TamanoFlota, Fuente, IdVendedor,
                           FechaIngreso, JustificacionDuplicado, IdUsuarioCrea)
    VALUES (@Empresa, @Contacto, @Correo, @Telefono, 'Nuevo', @Sector, @Direccion, @TamanoFlota, @Fuente, @IdVendedor,
            @Hoy, CASE WHEN EXISTS (SELECT 1 FROM @Coincidencias) THEN @JustificacionDuplicado END, @IdUsuario);
    SET @IdProspecto = SCOPE_IDENTITY();

    INSERT INTO ProspectoEstadoHistorial (IdProspecto, EstadoAnterior, EstadoNuevo, Motivo, IdUsuario)
    VALUES (@IdProspecto, NULL, 'Nuevo', 'Registro del prospecto', @IdUsuario);

    COMMIT TRANSACTION;

    SELECT @IdProspecto AS IdProspecto;
END
