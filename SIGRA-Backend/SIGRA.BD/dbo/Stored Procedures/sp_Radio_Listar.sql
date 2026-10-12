CREATE PROCEDURE sp_Radio_Listar
    @Texto       VARCHAR(100) = NULL,
    @NumeroSerie VARCHAR(50) = NULL,
    @SoloBateriaPorCambiar BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT x.*
    FROM (
        SELECT e.IdEquipo, e.NumeroSerie, m.Marca, m.Modelo, cat.Nombre AS Categoria, e.Estado, e.Ubicacion,
               ce.IdContrato, cl.Empresa, ce.FechaAsignacion,
               b.FechaCambio AS UltimoCambioBateria, b.NumeroSerieBateria,
               CASE WHEN b.FechaCambio IS NULL THEN N'Sin batería'
                    WHEN DATEADD(MONTH, 12, b.FechaCambio) <= CAST(GETDATE() AS DATE) THEN 'Vencida'
                    WHEN DATEADD(MONTH, 11, b.FechaCambio) <= CAST(GETDATE() AS DATE) THEN N'Próxima a vencer'
                    ELSE 'Buena' END AS EstadoBateria,
               DATEADD(MONTH, 12, b.FechaCambio) AS FechaVencimientoBateria
        FROM Equipo e
        INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
        INNER JOIN CategoriaEquipo cat ON cat.IdCategoria = m.IdCategoria
        INNER JOIN ContratoEquipo ce ON ce.IdEquipo = e.IdEquipo AND ce.FechaDevolucion IS NULL
        INNER JOIN Contrato ct ON ct.IdContrato = ce.IdContrato
        INNER JOIN Cliente cl ON cl.IdCliente = ct.IdCliente
        OUTER APPLY (SELECT TOP 1 cb.FechaCambio, cb.NumeroSerieBateria FROM CambioBateria cb
                     WHERE cb.IdRadio = e.IdEquipo ORDER BY cb.FechaCambio DESC, cb.IdCambioBateria DESC) b
        WHERE cat.Nombre IN (N'Radio portátil', N'Radio móvil')
          AND (@NumeroSerie IS NULL OR e.NumeroSerie = @NumeroSerie)
          AND (@Texto IS NULL OR e.NumeroSerie LIKE '%' + @Texto + '%' OR m.Modelo LIKE '%' + @Texto + '%' OR cl.Empresa LIKE '%' + @Texto + '%')
    ) x
    WHERE @SoloBateriaPorCambiar = 0 OR x.EstadoBateria IN (N'Próxima a vencer', 'Vencida')
    ORDER BY x.FechaAsignacion DESC, x.NumeroSerie;
END
