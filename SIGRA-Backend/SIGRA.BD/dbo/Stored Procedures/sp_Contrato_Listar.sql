CREATE PROCEDURE sp_Contrato_Listar
    @Texto  VARCHAR(150) = NULL,
    @Estado VARCHAR(30) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT x.*
    FROM (
        SELECT c.IdContrato, cl.Empresa, c.Estado AS EstadoRegistrado, CASE
        WHEN c.Estado = 'Activo' AND c.FechaVencimiento < CAST(GETDATE() AS DATE) THEN 'Vencido'
        WHEN c.Estado = 'Activo' AND c.FechaVencimiento <= DATEADD(DAY, 30, CAST(GETDATE() AS DATE)) THEN 'Por vencer'
        ELSE c.Estado
    END AS Estado,
           c.FechaInicio, c.FechaVencimiento, c.MontoMensual, c.Condiciones, c.IdVendedor, v.Nombre AS Vendedor,
               (SELECT COUNT(*) FROM ContratoEquipo ce WHERE ce.IdContrato = c.IdContrato) AS CantidadEquipos,
               ISNULL((SELECT STRING_AGG(e.NumeroSerie, ', ') FROM ContratoEquipo ce
                       INNER JOIN Equipo e ON e.IdEquipo = ce.IdEquipo WHERE ce.IdContrato = c.IdContrato), '') AS Series
        FROM Contrato c
        INNER JOIN Cliente cl ON cl.IdCliente = c.IdCliente
        LEFT JOIN Usuario v ON v.IdUsuario = c.IdVendedor
    ) x
    WHERE (@Estado IS NULL OR x.Estado = @Estado)
      AND (@Texto IS NULL OR x.Empresa LIKE '%' + @Texto + '%'
           OR 'CT-' + RIGHT('0000' + CAST(x.IdContrato AS VARCHAR(10)), 4) LIKE '%' + @Texto + '%'
           OR x.Series LIKE '%' + @Texto + '%')
    ORDER BY CASE WHEN @Estado = 'Por vencer' THEN x.FechaVencimiento END ASC, x.IdContrato DESC;
END
