CREATE PROCEDURE dbo.sp_Cuenta_Listar
    @Texto VARCHAR(150) = NULL,
    @IdRol INT = NULL,
    @Activo BIT = NULL,
    @Bloqueada BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.vw_CuentaDetalle
    WHERE (
        @Texto IS NULL
        OR Nombre LIKE '%' + @Texto + '%'
        OR Cedula LIKE '%' + @Texto + '%'
        OR Correo LIKE '%' + @Texto + '%'
    )
      AND (@IdRol IS NULL OR IdRol = @IdRol)
      AND (@Activo IS NULL OR Activo = @Activo)
      AND (@Bloqueada IS NULL OR Bloqueada = @Bloqueada)
    ORDER BY IdUsuario;
END;