
CREATE PROCEDURE sp_Rol_ExisteConNombreExcluyendo
    @Nombre VARCHAR(100),
    @IdRolExcluir INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT CAST(CASE WHEN EXISTS (
        SELECT 1 FROM Rol WHERE Nombre = @Nombre AND IdRol <> @IdRolExcluir
    ) THEN 1 ELSE 0 END AS BIT) AS Existe;
END
