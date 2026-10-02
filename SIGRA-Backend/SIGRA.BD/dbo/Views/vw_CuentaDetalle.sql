CREATE VIEW dbo.vw_CuentaDetalle AS
SELECT
    u.IdUsuario,
    u.Nombre,
    u.Correo,
    u.Cedula,
    u.FechaNacimiento,
    u.Telefono,
    u.Direccion,
    u.EstadoCivil,
    u.GradoAcademico,
    u.Salario,
    u.IdRol,
    r.Nombre AS Rol,
    u.Activo,
    u.FechaCreacion,
    u.UltimoAcceso,
    CAST(
        CASE WHEN u.BloqueadoHasta > GETUTCDATE()
             THEN 1 ELSE 0 END
        AS BIT
    ) AS Bloqueada
FROM dbo.Usuario u
INNER JOIN dbo.Rol r ON r.IdRol = u.IdRol
WHERE u.IdCliente IS NULL;