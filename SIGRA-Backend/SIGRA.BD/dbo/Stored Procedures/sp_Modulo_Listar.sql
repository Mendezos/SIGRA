
CREATE PROCEDURE sp_Modulo_Listar
AS
BEGIN
    SET NOCOUNT ON;

    SELECT IdModulo, Nombre, Activo
    FROM Modulo
    WHERE Activo = 1
    ORDER BY IdModulo;
END
