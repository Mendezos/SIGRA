
CREATE PROCEDURE sp_RolPermiso_ObtenerPorRol
    @IdRol INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.IdModulo, rp.Lectura, rp.Escritura, rp.Edicion, rp.Eliminacion
    FROM RolPermiso rp
    INNER JOIN Permiso p ON p.IdPermiso = rp.IdPermiso
    WHERE rp.IdRol = @IdRol;
END