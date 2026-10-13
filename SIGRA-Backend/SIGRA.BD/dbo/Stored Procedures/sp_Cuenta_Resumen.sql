CREATE PROCEDURE dbo.sp_Cuenta_Resumen
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
