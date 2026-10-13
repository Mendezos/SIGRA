CREATE PROCEDURE dbo.sp_Cuenta_Opciones
AS
BEGIN
    SET NOCOUNT ON;

    SELECT IdUsuario, Nombre
    FROM dbo.vw_CuentaDetalle
    ORDER BY Nombre, IdUsuario;
END;
