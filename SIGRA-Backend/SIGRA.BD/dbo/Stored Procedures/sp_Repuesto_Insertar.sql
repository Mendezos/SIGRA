CREATE PROCEDURE sp_Repuesto_Insertar
    @IdModelo INT,
    @Nombre   VARCHAR(100),
    @Cantidad INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Repuesto (IdModelo, Nombre, Cantidad) VALUES (@IdModelo, @Nombre, @Cantidad);

    SELECT SCOPE_IDENTITY() AS Id;
END
