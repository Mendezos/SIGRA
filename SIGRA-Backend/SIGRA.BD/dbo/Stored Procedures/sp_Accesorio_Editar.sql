CREATE PROCEDURE sp_Accesorio_Editar
    @Id       INT,
    @Nombre   VARCHAR(100),
    @Cantidad INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE AccesorioModelo SET Nombre = @Nombre, Cantidad = @Cantidad WHERE IdAccesorioModelo = @Id;
END
