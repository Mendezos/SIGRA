CREATE PROCEDURE sp_Rol_Listar
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
