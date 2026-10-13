CREATE PROCEDURE dbo.sp_Cuenta_Roles
AS
BEGIN
    SET NOCOUNT ON;

    -- Devuelve todos los roles (activos e inactivos); la interfaz decide
    -- cuáles se pueden asignar.
    SELECT IdRol, Nombre, Activo
    FROM dbo.Rol
    ORDER BY Nombre;
END;
