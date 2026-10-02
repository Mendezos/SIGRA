CREATE PROCEDURE dbo.sp_Cuenta_Roles
AS
BEGIN
    SET NOCOUNT ON;

    SELECT IdRol, Nombre
    FROM dbo.Rol
    WHERE Activo = 1
    ORDER BY Nombre;
END;