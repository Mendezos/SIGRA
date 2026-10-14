/*
  SIGRA - Migración 2026-10-11: correcciones de cuentas, bloqueo, roles y paginación.
  Ejecutar sobre la base de datos SIGRA (es idempotente: se puede correr varias veces).

  IMPORTANTE (SSMS ya usa QUOTED_IDENTIFIER ON; si usa sqlcmd agregue la opción -I).

  1. Corrige el error 500 al fallar el login: sp_Usuario_RegistrarLoginFallido (y otros
     SP) fueron creados con QUOTED_IDENTIFIER OFF y no pueden actualizar la tabla Usuario
     por su índice filtrado de cédula.
  2. Paginación de cuentas y bitácora en el servidor.
  3. Resumen real del módulo Usuarios y accesos (sp_Cuenta_Resumen).
  4. Guardado único y atómico de roles + permisos (sp_Rol_Guardar).
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- sp_Auditoria_ObtenerRecientesPorUsuario
CREATE OR ALTER PROCEDURE sp_Auditoria_ObtenerRecientesPorUsuario
    @IdUsuario INT,
    @Top INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP (@Top) IdAuditoria, IdUsuario, Modulo, Entidad, IdEntidad, Accion, Fecha, Detalle
    FROM Auditoria
    WHERE IdUsuario = @IdUsuario
    ORDER BY Fecha DESC;
END

GO

-- sp_Sesion_ActualizarActividad
CREATE OR ALTER PROCEDURE sp_Sesion_ActualizarActividad
    @TokenId VARCHAR(64)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE SesionUsuario SET UltimaActividad = GETUTCDATE() WHERE TokenId = @TokenId AND Activa = 1;
END

GO

-- sp_Sesion_Cerrar
CREATE OR ALTER PROCEDURE sp_Sesion_Cerrar
    @TokenId VARCHAR(64)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE SesionUsuario SET Activa = 0, FechaCierre = GETUTCDATE() WHERE TokenId = @TokenId AND Activa = 1;
END

GO

-- sp_Sesion_CerrarTodasDelUsuario
CREATE OR ALTER PROCEDURE sp_Sesion_CerrarTodasDelUsuario
    @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE SesionUsuario SET Activa = 0, FechaCierre = GETUTCDATE() WHERE IdUsuario = @IdUsuario AND Activa = 1;
END

GO

-- sp_Sesion_ObtenerActiva
CREATE OR ALTER PROCEDURE sp_Sesion_ObtenerActiva
    @TokenId VARCHAR(64)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT IdSesion, IdUsuario, TokenId, FechaInicio, FechaExpiracion, UltimaActividad, FechaCierre, Activa
    FROM SesionUsuario
    WHERE TokenId = @TokenId AND Activa = 1 AND FechaExpiracion > GETUTCDATE();
END

GO

-- sp_TokenRecuperacion_ObtenerValido
CREATE OR ALTER PROCEDURE sp_TokenRecuperacion_ObtenerValido
    @Token VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT IdToken, IdUsuario, Token, Expira, Usado
    FROM TokenRecuperacion
    WHERE Token = @Token AND Usado = 0 AND Expira > GETUTCDATE();
END

GO

-- sp_Usuario_ObtenerBloqueados
CREATE OR ALTER PROCEDURE sp_Usuario_ObtenerBloqueados
AS
BEGIN
    SET NOCOUNT ON;
    SELECT u.IdUsuario, u.IdRol, r.Nombre AS NombreRol, u.IdCliente, u.Nombre, u.Correo, u.Telefono,
           u.PasswordHash, u.Foto, u.Activo, u.IntentosFallidos, u.BloqueadoHasta, u.FechaBloqueo
    FROM Usuario u
    INNER JOIN Rol r ON r.IdRol = u.IdRol
    WHERE u.BloqueadoHasta IS NOT NULL AND u.BloqueadoHasta > GETUTCDATE()
    ORDER BY u.BloqueadoHasta ASC;
END

GO

-- sp_Usuario_RegistrarLoginFallido
CREATE OR ALTER PROCEDURE sp_Usuario_RegistrarLoginFallido
    @IdUsuario INT,
    @MaxIntentosFallidos INT,
    @DuracionBloqueoMinutos INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Usuario
    SET IntentosFallidos = IntentosFallidos + 1
    WHERE IdUsuario = @IdUsuario;

    DECLARE @IntentosActuales INT;
    DECLARE @CuentaBloqueada BIT = 0;
    DECLARE @BloqueadoHasta DATETIME;

    SELECT @IntentosActuales = IntentosFallidos, @BloqueadoHasta = BloqueadoHasta
    FROM Usuario WHERE IdUsuario = @IdUsuario;

    IF @IntentosActuales >= @MaxIntentosFallidos
    BEGIN
        SET @BloqueadoHasta = DATEADD(MINUTE, @DuracionBloqueoMinutos, GETUTCDATE());

        UPDATE Usuario
        SET BloqueadoHasta = @BloqueadoHasta,
            FechaBloqueo    = GETUTCDATE()
        WHERE IdUsuario = @IdUsuario;

        SET @CuentaBloqueada = 1;
    END

    SELECT @IntentosActuales AS IntentosFallidos, @CuentaBloqueada AS CuentaBloqueada, @BloqueadoHasta AS BloqueadoHasta;
END

GO

-- sp_Cuenta_Listar
CREATE OR ALTER PROCEDURE dbo.sp_Cuenta_Listar
    @Texto VARCHAR(150) = NULL,
    @IdRol INT = NULL,
    @Activo BIT = NULL,
    @Bloqueada BIT = NULL,
    @Pagina INT = 1,
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    SET @TamanoPagina = CASE
        WHEN @TamanoPagina IS NULL OR @TamanoPagina < 1 THEN 10
        WHEN @TamanoPagina > 100 THEN 100
        ELSE @TamanoPagina
    END;

    DECLARE @Total INT;

    SELECT @Total = COUNT(*)
    FROM dbo.vw_CuentaDetalle v
    WHERE (
        @Texto IS NULL
        OR CHARINDEX(@Texto, v.Nombre) > 0
        OR CHARINDEX(@Texto, v.Cedula) > 0
        OR CHARINDEX(@Texto, v.Correo) > 0
        OR CHARINDEX(@Texto, v.Telefono) > 0
    )
      AND (@IdRol IS NULL OR v.IdRol = @IdRol)
      AND (@Activo IS NULL OR v.Activo = @Activo)
      AND (@Bloqueada IS NULL OR v.Bloqueada = @Bloqueada);

    DECLARE @MaxPagina INT = CASE
        WHEN @Total = 0 THEN 1
        ELSE (@Total + @TamanoPagina - 1) / @TamanoPagina
    END;

    SET @Pagina = CASE
        WHEN @Pagina IS NULL OR @Pagina < 1 THEN 1
        WHEN @Pagina > @MaxPagina THEN @MaxPagina
        ELSE @Pagina
    END;

    -- Primer conjunto de resultados: datos de la paginación.
    SELECT @Total AS Total, @Pagina AS Pagina, @TamanoPagina AS TamanoPagina;

    -- Segundo conjunto: la página solicitada con todos los campos.
    SELECT
        v.IdUsuario,
        v.Nombre,
        v.Correo,
        v.Cedula,
        v.FechaNacimiento,
        v.Telefono,
        v.Direccion,
        v.EstadoCivil,
        v.GradoAcademico,
        v.Salario,
        v.IdRol,
        v.Rol,
        v.Activo,
        v.Bloqueada,
        u.IntentosFallidos,
        u.BloqueadoHasta,
        v.FechaCreacion,
        v.UltimoAcceso
    FROM dbo.vw_CuentaDetalle v
    INNER JOIN dbo.Usuario u ON u.IdUsuario = v.IdUsuario
    WHERE (
        @Texto IS NULL
        OR CHARINDEX(@Texto, v.Nombre) > 0
        OR CHARINDEX(@Texto, v.Cedula) > 0
        OR CHARINDEX(@Texto, v.Correo) > 0
        OR CHARINDEX(@Texto, v.Telefono) > 0
    )
      AND (@IdRol IS NULL OR v.IdRol = @IdRol)
      AND (@Activo IS NULL OR v.Activo = @Activo)
      AND (@Bloqueada IS NULL OR v.Bloqueada = @Bloqueada)
    ORDER BY v.Nombre, v.IdUsuario
    OFFSET (@Pagina - 1) * @TamanoPagina ROWS
    FETCH NEXT @TamanoPagina ROWS ONLY;
END;

GO

-- sp_Cuenta_Roles
CREATE OR ALTER PROCEDURE dbo.sp_Cuenta_Roles
AS
BEGIN
    SET NOCOUNT ON;

    -- Devuelve todos los roles (activos e inactivos); la interfaz decide
    -- cuáles se pueden asignar.
    SELECT IdRol, Nombre, Activo
    FROM dbo.Rol
    ORDER BY Nombre;
END;

GO

-- sp_Auditoria_Consultar
CREATE OR ALTER PROCEDURE dbo.sp_Auditoria_Consultar
    @Entidad VARCHAR(100) = NULL,
    @IdEntidad INT = NULL,
    @IdUsuarioAfectado INT = NULL,
    @IdAutor INT = NULL,
    @Desde DATE = NULL,
    @Hasta DATE = NULL,
    @Accion VARCHAR(50) = NULL,
    @Pagina INT = 1,
    @TamanoPagina INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    IF @Desde > @Hasta
        THROW 50001, 'La fecha inicial no puede superar la final.', 1;

    SET @TamanoPagina = CASE
        WHEN @TamanoPagina IS NULL OR @TamanoPagina < 1 THEN 10
        WHEN @TamanoPagina > 100 THEN 100
        ELSE @TamanoPagina
    END;

    DECLARE @DesdeUtc DATETIME2 =
        CASE WHEN @Desde IS NULL THEN NULL
             ELSE DATEADD(HOUR, 6, CONVERT(DATETIME2, @Desde)) END;

    DECLARE @HastaUtc DATETIME2 =
        CASE WHEN @Hasta IS NULL THEN NULL
             ELSE DATEADD(HOUR, 6, DATEADD(DAY, 1, CONVERT(DATETIME2, @Hasta))) END;

    DECLARE @Total INT;

    SELECT @Total = COUNT(*)
    FROM dbo.Auditoria a
    WHERE (@Entidad IS NULL OR a.Entidad = @Entidad)
      AND (@IdEntidad IS NULL OR a.IdEntidad = @IdEntidad)
      AND (
          @IdUsuarioAfectado IS NULL
          OR COALESCE(
              a.IdUsuarioAfectado,
              CASE WHEN a.Entidad = 'Usuario' THEN a.IdEntidad END
          ) = @IdUsuarioAfectado
      )
      AND (@IdAutor IS NULL OR a.IdUsuario = @IdAutor)
      AND (@Accion IS NULL OR a.Accion = @Accion)
      AND (@DesdeUtc IS NULL OR a.Fecha >= @DesdeUtc)
      AND (@HastaUtc IS NULL OR a.Fecha < @HastaUtc);

    DECLARE @MaxPagina INT = CASE
        WHEN @Total = 0 THEN 1
        ELSE (@Total + @TamanoPagina - 1) / @TamanoPagina
    END;

    SET @Pagina = CASE
        WHEN @Pagina IS NULL OR @Pagina < 1 THEN 1
        WHEN @Pagina > @MaxPagina THEN @MaxPagina
        ELSE @Pagina
    END;

    -- Primer conjunto de resultados: datos de la paginación.
    SELECT @Total AS Total, @Pagina AS Pagina, @TamanoPagina AS TamanoPagina;

    -- Segundo conjunto: la página solicitada.
    SELECT
        a.IdAuditoria,
        a.Modulo,
        a.Entidad,
        a.IdEntidad,
        a.Accion,
        a.Fecha,
        a.Detalle,
        a.IdUsuario AS IdAutor,
        COALESCE(u.Nombre, 'Sistema') AS Autor,
        COALESCE(
            a.IdUsuarioAfectado,
            CASE WHEN a.Entidad = 'Usuario' THEN a.IdEntidad END
        ) AS IdUsuarioAfectado,
        COALESCE(ua.Nombre, r.Nombre) AS Objetivo
    FROM dbo.Auditoria a
    LEFT JOIN dbo.Usuario u ON u.IdUsuario = a.IdUsuario
    LEFT JOIN dbo.Usuario ua
        ON ua.IdUsuario = COALESCE(
            a.IdUsuarioAfectado,
            CASE WHEN a.Entidad = 'Usuario' THEN a.IdEntidad END
        )
    LEFT JOIN dbo.Rol r ON a.Entidad = 'Rol' AND r.IdRol = a.IdEntidad
    WHERE (@Entidad IS NULL OR a.Entidad = @Entidad)
      AND (@IdEntidad IS NULL OR a.IdEntidad = @IdEntidad)
      AND (
          @IdUsuarioAfectado IS NULL
          OR COALESCE(
              a.IdUsuarioAfectado,
              CASE WHEN a.Entidad = 'Usuario' THEN a.IdEntidad END
          ) = @IdUsuarioAfectado
      )
      AND (@IdAutor IS NULL OR a.IdUsuario = @IdAutor)
      AND (@Accion IS NULL OR a.Accion = @Accion)
      AND (@DesdeUtc IS NULL OR a.Fecha >= @DesdeUtc)
      AND (@HastaUtc IS NULL OR a.Fecha < @HastaUtc)
    ORDER BY a.Fecha DESC, a.IdAuditoria DESC
    OFFSET (@Pagina - 1) * @TamanoPagina ROWS
    FETCH NEXT @TamanoPagina ROWS ONLY;
END;

GO

-- sp_Rol_Listar
CREATE OR ALTER PROCEDURE sp_Rol_Listar
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        r.IdRol,
        r.Nombre,
        r.Descripcion,
        r.Activo,
        (SELECT COUNT(*)
         FROM Usuario u
         WHERE u.IdRol = r.IdRol AND u.IdCliente IS NULL) AS Usuarios,
        (SELECT COUNT(*)
         FROM RolPermiso rp
         WHERE rp.IdRol = r.IdRol
           AND (rp.Lectura = 1 OR rp.Escritura = 1 OR rp.Edicion = 1 OR rp.Eliminacion = 1)) AS ModulosConAcceso
    FROM Rol r
    ORDER BY r.Nombre;
END

GO

-- sp_Cuenta_Resumen
CREATE OR ALTER PROCEDURE dbo.sp_Cuenta_Resumen
AS
BEGIN
    SET NOCOUNT ON;

    -- Inicio del día actual en Costa Rica (UTC-6) expresado en UTC.
    DECLARE @InicioHoyUtc DATETIME2 =
        DATEADD(HOUR, 6, CONVERT(DATETIME2, CONVERT(DATE, DATEADD(HOUR, -6, GETUTCDATE()))));

    SELECT
        (SELECT COUNT(*) FROM dbo.vw_CuentaDetalle WHERE Activo = 1) AS UsuariosActivos,
        (SELECT COUNT(*) FROM dbo.vw_CuentaDetalle WHERE Activo = 0) AS UsuariosInactivos,
        (SELECT COUNT(*) FROM dbo.vw_CuentaDetalle WHERE Bloqueada = 1) AS CuentasBloqueadas,
        (SELECT COUNT(*) FROM dbo.Rol) AS RolesDefinidos,
        (SELECT COUNT(*) FROM dbo.Rol WHERE Activo = 1) AS RolesActivos,
        (SELECT COUNT(*) FROM dbo.SesionUsuario WHERE FechaInicio >= @InicioHoyUtc) AS SesionesHoy;
END;

GO

-- sp_Cuenta_Opciones
CREATE OR ALTER PROCEDURE dbo.sp_Cuenta_Opciones
AS
BEGIN
    SET NOCOUNT ON;

    SELECT IdUsuario, Nombre
    FROM dbo.vw_CuentaDetalle
    ORDER BY Nombre, IdUsuario;
END;

GO

-- sp_Rol_Guardar
CREATE OR ALTER PROCEDURE dbo.sp_Rol_Guardar
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

GO

