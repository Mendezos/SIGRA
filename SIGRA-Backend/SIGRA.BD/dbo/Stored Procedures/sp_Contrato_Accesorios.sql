CREATE PROCEDURE sp_Contrato_Accesorios
    @IdContrato INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ca.IdAccesorioModelo, a.Nombre, m.Marca + ' ' + m.Modelo AS Modelo, ca.Cantidad
    FROM ContratoAccesorio ca
    INNER JOIN AccesorioModelo a ON a.IdAccesorioModelo = ca.IdAccesorioModelo
    INNER JOIN ModeloEquipo m ON m.IdModelo = a.IdModelo
    WHERE ca.IdContrato = @IdContrato
    ORDER BY m.Marca, m.Modelo, a.Nombre;
END
