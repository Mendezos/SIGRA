CREATE PROCEDURE dbo.sp_Rol_Guardar
    @IdAutor INT,
    @IdRol INT = NULL,
    @Nombre VARCHAR(100),
    @Descripcion VARCHAR(250) = NULL,
    @Activo BIT = NULL,
    @Permisos NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE
            @NombreAdmin VARCHAR(100) = 'Administrador del sistema',
            @NombreAnterior VARCHAR(100),
            @DescripcionAnterior VARCHAR(250),
            @ActivoAnterior BIT,
            @EsAdmin BIT = 0,
            @Mensaje NVARCHAR(400),
            @Detalle VARCHAR(MAX),
            @ModulosCambiados VARCHAR(MAX);

        SET @Nombre = LTRIM(RTRIM(COALESCE(@Nombre, '')));
        SET @Descripcion = NULLIF(LTRIM(RTRIM(COALESCE(@Descripcion, ''))), '');

        IF @Nombre = ''
            THROW 50001, 'El nombre del rol es obligatorio.', 1;

        IF @Permisos IS NOT NULL AND ISJSON(@Permisos) = 0
            THROW 50001, 'El formato de los permisos no es válido.', 1;

        IF @IdRol IS NOT NULL
        BEGIN
            SELECT
                @NombreAnterior = Nombre,
                @DescripcionAnterior = Descripcion,
                @ActivoAnterior = Activo
            FROM dbo.Rol WITH (UPDLOCK, HOLDLOCK)
            WHERE IdRol = @IdRol;

            IF @NombreAnterior IS NULL
                THROW 50001, 'El rol indicado no existe.', 1;

            SET @EsAdmin = CASE
                WHEN @NombreAnterior COLLATE Latin1_General_BIN = @NombreAdmin THEN 1
                ELSE 0
            END;

            IF @EsAdmin = 1
               AND (@Nombre COLLATE Latin1_General_BIN <> @NombreAdmin OR @Activo = 0)
                THROW 50001, 'El rol Administrador del sistema no se puede renombrar ni desactivar.', 1;
        END;

        IF EXISTS (
            SELECT 1
            FROM dbo.Rol WITH (UPDLOCK, HOLDLOCK)
            WHERE Nombre = @Nombre
              AND IdRol <> COALESCE(@IdRol, 0)
        )
        BEGIN
            SET @Mensaje = CONCAT('Ya existe un rol con el nombre "', @Nombre, '".');
            THROW 50001, @Mensaje, 1;
        END;

        -- Permisos recibidos (si se enviaron).
        DECLARE @Recibidos TABLE (
            IdModulo INT NULL,
            Lectura BIT NULL,
            Escritura BIT NULL,
            Edicion BIT NULL,
            Eliminacion BIT NULL
        );

        DECLARE @P TABLE (
            IdModulo INT NOT NULL PRIMARY KEY,
            Lectura BIT NOT NULL,
            Escritura BIT NOT NULL,
            Edicion BIT NOT NULL,
            Eliminacion BIT NOT NULL
        );

        IF @Permisos IS NOT NULL
        BEGIN
            INSERT @Recibidos (IdModulo, Lectura, Escritura, Edicion, Eliminacion)
            SELECT IdModulo, Lectura, Escritura, Edicion, Eliminacion
            FROM OPENJSON(@Permisos)
            WITH (
                IdModulo INT '$.idModulo',
                Lectura BIT '$.lectura',
                Escritura BIT '$.escritura',
                Edicion BIT '$.edicion',
                Eliminacion BIT '$.eliminacion'
            );

            IF EXISTS (
                SELECT 1
                FROM @Recibidos r
                LEFT JOIN dbo.Modulo m ON m.IdModulo = r.IdModulo AND m.Activo = 1
                WHERE r.IdModulo IS NULL OR m.IdModulo IS NULL
            )
                THROW 50001, 'Uno de los módulos indicados no es válido.', 1;

            INSERT @P (IdModulo, Lectura, Escritura, Edicion, Eliminacion)
            SELECT
                IdModulo,
                MAX(CONVERT(INT, COALESCE(Lectura, 0))),
                MAX(CONVERT(INT, COALESCE(Escritura, 0))),
                MAX(CONVERT(INT, COALESCE(Edicion, 0))),
                MAX(CONVERT(INT, COALESCE(Eliminacion, 0)))
            FROM @Recibidos
            GROUP BY IdModulo;

            -- El administrador siempre conserva el acceso total a Usuarios y accesos
            -- para no quedarse sin poder gestionar cuentas y roles.
            IF @EsAdmin = 1
            BEGIN
                DELETE FROM @P WHERE IdModulo = 1;
                INSERT @P VALUES (1, 1, 1, 1, 1);
            END;

            SELECT @ModulosCambiados = STRING_AGG(m.Nombre, ', ') WITHIN GROUP (ORDER BY m.IdModulo)
            FROM @P p
            INNER JOIN dbo.Modulo m ON m.IdModulo = p.IdModulo
            LEFT JOIN dbo.Permiso pe ON pe.IdModulo = p.IdModulo
            LEFT JOIN dbo.RolPermiso rp
                ON rp.IdPermiso = pe.IdPermiso AND rp.IdRol = @IdRol
            WHERE COALESCE(rp.Lectura, 0) <> p.Lectura
               OR COALESCE(rp.Escritura, 0) <> p.Escritura
               OR COALESCE(rp.Edicion, 0) <> p.Edicion
               OR COALESCE(rp.Eliminacion, 0) <> p.Eliminacion;
        END;

        IF @IdRol IS NULL
        BEGIN
            INSERT dbo.Rol (Nombre, Descripcion, Activo)
            VALUES (@Nombre, @Descripcion, COALESCE(@Activo, 1));

            SET @IdRol = CONVERT(INT, SCOPE_IDENTITY());

            INSERT dbo.Auditoria (IdUsuario, Modulo, Entidad, IdEntidad, Accion, Detalle)
            VALUES (@IdAutor, 'Seguridad', 'Rol', @IdRol, 'ROL_CREADO', @Nombre);

            IF COALESCE(@Activo, 1) = 0
                INSERT dbo.Auditoria (IdUsuario, Modulo, Entidad, IdEntidad, Accion, Detalle)
                VALUES (@IdAutor, 'Seguridad', 'Rol', @IdRol, 'ROL_DESACTIVADO', @Nombre);
        END;
        ELSE
        BEGIN
            UPDATE dbo.Rol
            SET Nombre = @Nombre,
                Descripcion = @Descripcion,
                Activo = COALESCE(@Activo, Activo)
            WHERE IdRol = @IdRol;

            IF @Nombre COLLATE Latin1_General_BIN <> @NombreAnterior COLLATE Latin1_General_BIN
            BEGIN
                SET @Detalle = CONCAT('De "', @NombreAnterior, '" a "', @Nombre, '"');

                INSERT dbo.Auditoria (IdUsuario, Modulo, Entidad, IdEntidad, Accion, Detalle)
                VALUES (@IdAutor, 'Seguridad', 'Rol', @IdRol, 'ROL_EDITADO', @Detalle);
            END;
            ELSE IF COALESCE(@Descripcion, '') <> COALESCE(@DescripcionAnterior, '')
            BEGIN
                SET @Detalle = CONCAT('Rol "', @Nombre, '": descripción actualizada');

                INSERT dbo.Auditoria (IdUsuario, Modulo, Entidad, IdEntidad, Accion, Detalle)
                VALUES (@IdAutor, 'Seguridad', 'Rol', @IdRol, 'ROL_EDITADO', @Detalle);
            END;

            IF @Activo IS NOT NULL AND @Activo <> @ActivoAnterior
                INSERT dbo.Auditoria (IdUsuario, Modulo, Entidad, IdEntidad, Accion, Detalle)
                VALUES (
                    @IdAutor, 'Seguridad', 'Rol', @IdRol,
                    CASE WHEN @Activo = 1 THEN 'ROL_ACTIVADO' ELSE 'ROL_DESACTIVADO' END,
                    @Nombre
                );
        END;

        IF EXISTS (SELECT 1 FROM @P)
        BEGIN
            INSERT dbo.Permiso (IdModulo)
            SELECT p.IdModulo
            FROM @P p
            WHERE NOT EXISTS (SELECT 1 FROM dbo.Permiso x WHERE x.IdModulo = p.IdModulo);

            UPDATE rp
            SET Lectura = p.Lectura,
                Escritura = p.Escritura,
                Edicion = p.Edicion,
                Eliminacion = p.Eliminacion
            FROM dbo.RolPermiso rp
            INNER JOIN dbo.Permiso pe ON pe.IdPermiso = rp.IdPermiso
            INNER JOIN @P p ON p.IdModulo = pe.IdModulo
            WHERE rp.IdRol = @IdRol;

            INSERT dbo.RolPermiso (IdRol, IdPermiso, Lectura, Escritura, Edicion, Eliminacion)
            SELECT @IdRol, pe.IdPermiso, p.Lectura, p.Escritura, p.Edicion, p.Eliminacion
            FROM @P p
            INNER JOIN dbo.Permiso pe ON pe.IdModulo = p.IdModulo
            WHERE NOT EXISTS (
                SELECT 1 FROM dbo.RolPermiso x
                WHERE x.IdRol = @IdRol AND x.IdPermiso = pe.IdPermiso
            );

            IF @ModulosCambiados IS NOT NULL
            BEGIN
                SET @Detalle = CONCAT('Rol "', @Nombre, '" - módulos: ', @ModulosCambiados);

                INSERT dbo.Auditoria (IdUsuario, Modulo, Entidad, IdEntidad, Accion, Detalle)
                VALUES (@IdAutor, 'Seguridad', 'Rol', @IdRol, 'PERMISOS_DEFINIDOS', @Detalle);
            END;
        END;

        COMMIT;

        SELECT IdRol, Nombre, Descripcion, Activo
        FROM dbo.Rol
        WHERE IdRol = @IdRol;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH;
END;
