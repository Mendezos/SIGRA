CREATE PROCEDURE sp_Repuesto_Editar
    @Id       INT,
    @Nombre   VARCHAR(100),
    @Cantidad INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Repuesto SET Nombre = @Nombre, Cantidad = @Cantidad WHERE IdRepuesto = @Id;
END
