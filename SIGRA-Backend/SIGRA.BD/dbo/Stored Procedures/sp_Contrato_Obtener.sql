CREATE PROCEDURE sp_Contrato_Obtener
    @IdContrato INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT c.IdContrato, cl.Empresa, c.Estado AS EstadoRegistrado, CASE
        WHEN c.Estado = 'Activo' AND c.FechaVencimiento < CAST(GETDATE() AS DATE) THEN 'Vencido'
        WHEN c.Estado = 'Activo' AND c.FechaVencimiento <= DATEADD(DAY, 30, CAST(GETDATE() AS DATE)) THEN 'Por vencer'
        ELSE c.Estado
    END AS Estado,
           c.FechaInicio, c.FechaVencimiento, c.MontoMensual, c.Condiciones, c.IdVendedor, v.Nombre AS Vendedor, 0 AS CantidadEquipos, '' AS Series
    FROM Contrato c
    INNER JOIN Cliente cl ON cl.IdCliente = c.IdCliente
    LEFT JOIN Usuario v ON v.IdUsuario = c.IdVendedor
    WHERE c.IdContrato = @IdContrato;
END
