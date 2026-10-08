CREATE PROCEDURE sp_Contacto_Existe
    @IdContacto INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT CASE WHEN EXISTS (SELECT 1 FROM ContactoInicial WHERE IdContacto = @IdContacto) THEN 1 ELSE 0 END;
END
