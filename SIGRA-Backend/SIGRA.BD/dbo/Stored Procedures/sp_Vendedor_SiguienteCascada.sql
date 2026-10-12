CREATE PROCEDURE sp_Vendedor_SiguienteCascada
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Ultimo INT = (SELECT TOP 1 IdVendedor FROM ContactoInicial WHERE IdVendedor IS NOT NULL ORDER BY IdContacto DESC);

    SELECT TOP 1 v.IdUsuario, v.Nombre
    FROM (
        SELECT u.IdUsuario, u.Nombre
    FROM Usuario u
    INNER JOIN Rol r ON r.IdRol = u.IdRol
    WHERE r.Nombre = 'Vendedor / Ejecutivo de cuenta' AND u.Activo = 1
    ) v
    ORDER BY CASE WHEN @Ultimo IS NULL OR v.IdUsuario > @Ultimo THEN 0 ELSE 1 END, v.IdUsuario;
END
