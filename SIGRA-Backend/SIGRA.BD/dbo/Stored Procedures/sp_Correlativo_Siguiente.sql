CREATE PROCEDURE [dbo].[sp_Correlativo_Siguiente] @Nombre VARCHAR(100), @Valor BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF @@TRANCOUNT = 0 THROW 50001, 'El número debe generarse dentro de la transacción de registro.', 1;
    IF NOT EXISTS (SELECT 1 FROM Correlativo WITH (UPDLOCK,HOLDLOCK) WHERE Nombre = @Nombre)
        INSERT Correlativo (Nombre, Valor) VALUES (@Nombre,0);
    UPDATE Correlativo SET Valor = Valor + 1 WHERE Nombre = @Nombre;
    SELECT @Valor = Valor FROM Correlativo WHERE Nombre = @Nombre;
END;
