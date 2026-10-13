CREATE PROCEDURE dbo.sp_Cuenta_Listar
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
