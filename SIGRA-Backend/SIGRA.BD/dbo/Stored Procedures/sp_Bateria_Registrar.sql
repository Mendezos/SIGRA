CREATE PROCEDURE sp_Bateria_Registrar
    @IdRadio            INT,
    @NumeroSerieBateria VARCHAR(50),
    @FechaCambio        DATE,
    @IdUsuario          INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    INSERT INTO CambioBateria (IdRadio, IdBateriaNueva, NumeroSerieBateria, IdUsuario, FechaCambio)
    VALUES (@IdRadio, NULL, @NumeroSerieBateria, @IdUsuario, @FechaCambio);

    INSERT INTO BitacoraEquipo (IdEquipo, Descripcion)
    VALUES (@IdRadio, N'Cambio de batería: nueva batería ' + @NumeroSerieBateria + N' instalada el ' + CONVERT(VARCHAR(10), @FechaCambio, 103) + N'.');

    COMMIT TRANSACTION;
END
