CREATE PROCEDURE sp_Contacto_Reasignar
    @IdContacto INT,
    @IdVendedor INT,
    @IdUsuario  INT,
    @Motivo     VARCHAR(300)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Anterior INT;

    BEGIN TRANSACTION;

    SELECT @Anterior = IdVendedor FROM ContactoInicial WHERE IdContacto = @IdContacto;

    UPDATE ContactoInicial SET IdVendedor = @IdVendedor, Estado = 'Asignado' WHERE IdContacto = @IdContacto;

    INSERT INTO ContactoHistorial (IdContacto, IdUsuario, IdVendedorAnterior, IdVendedorNuevo, Motivo)
    VALUES (@IdContacto, @IdUsuario, @Anterior, @IdVendedor, @Motivo);

    COMMIT TRANSACTION;
END
