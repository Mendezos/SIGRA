CREATE PROCEDURE dbo.sp_Cuenta_Guardar
    @Operacion VARCHAR(10),
    @IdAutor INT,
    @IdUsuario INT = NULL,
    @Nombre VARCHAR(150) = NULL,
    @Correo VARCHAR(150) = NULL,
    @Cedula VARCHAR(20) = NULL,
    @FechaNacimiento DATE = NULL,
    @Telefono VARCHAR(20) = NULL,
    @Direccion VARCHAR(300) = NULL,
    @EstadoCivil VARCHAR(50) = NULL,
    @GradoAcademico VARCHAR(100) = NULL,
    @Salario DECIMAL(18,2) = NULL,
    @IdRol INT = NULL,
    @Activo BIT = NULL,
    @Motivo VARCHAR(500) = NULL,
    @PasswordHash VARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE
            @Administradores INT,
            @RolAnterior INT,
            @EstadoAnterior BIT,
            @NombreRolAnterior VARCHAR(100),
            @NombreRolNuevo VARCHAR(100),
            @Antes NVARCHAR(MAX),
            @Despues NVARCHAR(MAX),
            @Detalle NVARCHAR(MAX),
            @Accion VARCHAR(50);

        -- Evita que dos cambios simultáneos eliminen al último administrador.
        SELECT @Administradores = COUNT(*)
        FROM dbo.Usuario u WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN dbo.Rol r ON r.IdRol = u.IdRol
        WHERE u.Activo = 1
          AND r.Activo = 1
          AND r.Nombre = 'Administrador del sistema'
          AND u.IdCliente IS NULL;

        IF NOT EXISTS (
            SELECT 1
            FROM dbo.Usuario u
            INNER JOIN dbo.Rol r ON r.IdRol = u.IdRol
            WHERE u.IdUsuario = @IdAutor
              AND u.Activo = 1
              AND r.Activo = 1
              AND r.Nombre = 'Administrador del sistema'
              AND u.IdCliente IS NULL
        )
            THROW 50001, 'No tiene autorización para administrar cuentas.', 1;

        IF @Operacion NOT IN ('Crear', 'Editar', 'Estado', 'Rol')
            THROW 50001, 'Operación inválida.', 1;

        IF @Operacion <> 'Crear'
        BEGIN
            SELECT
                @RolAnterior = u.IdRol,
                @EstadoAnterior = u.Activo,
                @NombreRolAnterior = r.Nombre
            FROM dbo.Usuario u WITH (UPDLOCK, HOLDLOCK)
            INNER JOIN dbo.Rol r ON r.IdRol = u.IdRol
            WHERE u.IdUsuario = @IdUsuario
              AND u.IdCliente IS NULL;

            IF @RolAnterior IS NULL
                THROW 50001, 'La cuenta indicada no existe.', 1;

            SET @Antes = (
                SELECT *
                FROM dbo.vw_CuentaDetalle
                WHERE IdUsuario = @IdUsuario
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES
            );
        END;

        IF @Operacion IN ('Crear', 'Rol')
           OR (@Operacion = 'Estado' AND @Activo = 1)
        BEGIN
            SELECT @NombreRolNuevo = Nombre
            FROM dbo.Rol WITH (HOLDLOCK)
            WHERE IdRol = @IdRol AND Activo = 1;

            IF @NombreRolNuevo IS NULL
                THROW 50001, 'Debe seleccionar un rol existente y activo.', 1;
        END;

        IF @Operacion = 'Estado'
        BEGIN
            IF @Activo IS NULL OR @Activo = @EstadoAnterior
                THROW 50001, 'La cuenta ya tiene ese estado o falta indicar el estado.', 1;

            IF @Activo = 0 AND NULLIF(LTRIM(RTRIM(@Motivo)), '') IS NULL
                THROW 50001, 'Debe indicar el motivo de la desactivación.', 1;

            IF @Activo = 0 AND @IdUsuario = @IdAutor
                THROW 50001, 'No puede desactivar su propia cuenta.', 1;
        END;

        IF @Operacion = 'Rol'
           AND (@EstadoAnterior = 0 OR @IdRol = @RolAnterior)
            THROW 50001, 'La cuenta debe estar activa y el rol debe ser diferente.', 1;

        IF @EstadoAnterior = 1
           AND @NombreRolAnterior = 'Administrador del sistema'
           AND @Administradores <= 1
           AND (
               (@Operacion = 'Estado' AND @Activo = 0)
               OR (
                   @Operacion = 'Rol'
                   AND @NombreRolNuevo <> 'Administrador del sistema'
               )
           )
            THROW 50001, 'Debe conservar al menos un administrador activo.', 1;

        IF @Operacion IN ('Crear', 'Editar')
        BEGIN
            IF NULLIF(LTRIM(RTRIM(@Nombre)), '') IS NULL
               OR NULLIF(@Correo, '') IS NULL
               OR @FechaNacimiento IS NULL
               OR NULLIF(@Telefono, '') IS NULL
               OR NULLIF(LTRIM(RTRIM(@Direccion)), '') IS NULL
               OR NULLIF(LTRIM(RTRIM(@EstadoCivil)), '') IS NULL
               OR NULLIF(LTRIM(RTRIM(@GradoAcademico)), '') IS NULL
               OR @Salario IS NULL
                THROW 50001, 'Complete los datos obligatorios de la cuenta.', 1;

            IF @Salario < 0
               OR @FechaNacimiento > CONVERT(DATE, DATEADD(HOUR, -6, GETUTCDATE()))
                THROW 50001, 'Revise el salario y la fecha de nacimiento.', 1;

            IF EXISTS (
                SELECT 1
                FROM dbo.Usuario
                WHERE Correo = @Correo
                  AND IdUsuario <> COALESCE(@IdUsuario, 0)
            )
                THROW 50001, 'El correo ya pertenece a otra cuenta.', 1;
        END;

        IF @Operacion = 'Crear'
        BEGIN
            IF @Activo IS NULL
               OR NULLIF(@Cedula, '') IS NULL
               OR NULLIF(@PasswordHash, '') IS NULL
                THROW 50001, 'Faltan la cédula, el estado o la contraseña inicial.', 1;

            IF EXISTS (SELECT 1 FROM dbo.Usuario WHERE Cedula = @Cedula)
                THROW 50001, 'La cédula ya pertenece a otra cuenta.', 1;

            INSERT dbo.Usuario (
                Nombre, Correo, Cedula, FechaNacimiento, Telefono,
                Direccion, EstadoCivil, GradoAcademico, Salario,
                IdRol, Activo, PasswordHash,
                IntentosFallidos, BloqueadoHasta, FechaBloqueo
            )
            VALUES (
                @Nombre, @Correo, @Cedula, @FechaNacimiento, @Telefono,
                @Direccion, @EstadoCivil, @GradoAcademico, @Salario,
                @IdRol, @Activo, @PasswordHash,
                0, NULL, NULL
            );

            SET @IdUsuario = CONVERT(INT, SCOPE_IDENTITY());
            SET @Accion = 'CUENTA_CREADA';
        END;
        ELSE IF @Operacion = 'Editar'
        BEGIN
            UPDATE dbo.Usuario
            SET Nombre = @Nombre,
                Correo = @Correo,
                FechaNacimiento = @FechaNacimiento,
                Telefono = @Telefono,
                Direccion = @Direccion,
                EstadoCivil = @EstadoCivil,
                GradoAcademico = @GradoAcademico,
                Salario = @Salario
            WHERE IdUsuario = @IdUsuario;

            SET @Accion = 'CUENTA_EDITADA';
        END;
        ELSE IF @Operacion = 'Estado'
        BEGIN
            UPDATE dbo.Usuario
            SET Activo = @Activo,
                IdRol = CASE WHEN @Activo = 1 THEN @IdRol ELSE IdRol END
            WHERE IdUsuario = @IdUsuario;

            SET @Accion = CASE
                WHEN @Activo = 1 THEN 'CUENTA_REACTIVADA'
                ELSE 'CUENTA_DESACTIVADA'
            END;
        END;
        ELSE
        BEGIN
            UPDATE dbo.Usuario
            SET IdRol = @IdRol
            WHERE IdUsuario = @IdUsuario;

            SET @Accion = 'ROL_CAMBIADO';
        END;

        IF @Operacion IN ('Estado', 'Rol')
        BEGIN
            UPDATE dbo.SesionUsuario
            SET Activa = 0, FechaCierre = GETUTCDATE()
            WHERE IdUsuario = @IdUsuario AND Activa = 1;
        END;

        SET @Despues = (
            SELECT *
            FROM dbo.vw_CuentaDetalle
            WHERE IdUsuario = @IdUsuario
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES
        );

        SET @Detalle = (
            SELECT
                JSON_QUERY(@Antes) AS antes,
                JSON_QUERY(@Despues) AS despues,
                @Motivo AS motivo
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES
        );

        INSERT dbo.Auditoria (
            IdUsuario, Modulo, Entidad, IdEntidad,
            IdUsuarioAfectado, Accion, Detalle
        )
        VALUES (
            @IdAutor, 'Usuarios y Accesos', 'Usuario', @IdUsuario,
            @IdUsuario, @Accion, @Detalle
        );

        COMMIT;
        SELECT @IdUsuario;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH;
END;