CREATE PROCEDURE sp_Radio_Listar
    @Texto       VARCHAR(100) = NULL,
    @NumeroSerie VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT e.IdEquipo, e.NumeroSerie, m.Marca, m.Modelo, cat.Nombre AS Categoria, e.Estado, e.Ubicacion,
           ce.IdContrato, cl.Empresa, ce.FechaAsignacion,
           (SELECT MAX(cb.FechaCambio) FROM CambioBateria cb WHERE cb.IdRadio = e.IdEquipo) AS UltimoCambioBateria
    FROM Equipo e
    INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    INNER JOIN CategoriaEquipo cat ON cat.IdCategoria = m.IdCategoria
    INNER JOIN ContratoEquipo ce ON ce.IdEquipo = e.IdEquipo
        AND ce.IdContratoEquipo = (SELECT MAX(x.IdContratoEquipo) FROM ContratoEquipo x WHERE x.IdEquipo = e.IdEquipo)
    INNER JOIN Contrato ct ON ct.IdContrato = ce.IdContrato
    INNER JOIN Cliente cl ON cl.IdCliente = ct.IdCliente
    WHERE cat.Nombre IN (N'Radio portátil', N'Radio móvil')
      AND (@NumeroSerie IS NULL OR e.NumeroSerie = @NumeroSerie)
      AND (@Texto IS NULL OR e.NumeroSerie LIKE '%' + @Texto + '%' OR m.Modelo LIKE '%' + @Texto + '%' OR cl.Empresa LIKE '%' + @Texto + '%')
    ORDER BY ce.FechaAsignacion DESC, e.NumeroSerie;
END
