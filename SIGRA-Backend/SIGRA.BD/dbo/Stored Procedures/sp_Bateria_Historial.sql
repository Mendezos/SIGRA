CREATE PROCEDURE sp_Bateria_Historial
    @IdRadio INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT cb.FechaCambio, cb.NumeroSerieBateria, u.Nombre AS Usuario
    FROM CambioBateria cb
    INNER JOIN Usuario u ON u.IdUsuario = cb.IdUsuario
    WHERE cb.IdRadio = @IdRadio
    ORDER BY cb.FechaCambio DESC, cb.IdCambioBateria DESC;
END
