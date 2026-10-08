CREATE PROCEDURE sp_Contrato_Equipos
    @IdContrato INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT e.IdEquipo, e.NumeroSerie, m.Marca, m.Modelo, cat.Nombre AS Categoria, e.Estado, ce.FechaAsignacion
    FROM ContratoEquipo ce
    INNER JOIN Equipo e ON e.IdEquipo = ce.IdEquipo
    INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    INNER JOIN CategoriaEquipo cat ON cat.IdCategoria = m.IdCategoria
    WHERE ce.IdContrato = @IdContrato
    ORDER BY cat.Nombre, e.NumeroSerie;
END
