-- Equipos asignados al contrato; si sigue en borrador, la lista de equipos que se piensan alquilar.
CREATE PROCEDURE sp_Contrato_Equipos
    @IdContrato INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT x.IdEquipo, x.NumeroSerie, x.Marca, x.Modelo, x.Categoria, x.Estado, x.FechaAsignacion
    FROM (
        SELECT e.IdEquipo, e.NumeroSerie, m.Marca, m.Modelo, cat.Nombre AS Categoria, e.Estado, ce.FechaAsignacion
        FROM ContratoEquipo ce
        INNER JOIN Equipo e ON e.IdEquipo = ce.IdEquipo
        INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
        INNER JOIN CategoriaEquipo cat ON cat.IdCategoria = m.IdCategoria
        WHERE ce.IdContrato = @IdContrato AND ce.FechaDevolucion IS NULL
        UNION ALL
        SELECT e.IdEquipo, e.NumeroSerie, m.Marca, m.Modelo, cat.Nombre, e.Estado, c.FechaInicio
        FROM ContratoEquipoBorrador b
        INNER JOIN Contrato c ON c.IdContrato = b.IdContrato
        INNER JOIN Equipo e ON e.IdEquipo = b.IdEquipo
        INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
        INNER JOIN CategoriaEquipo cat ON cat.IdCategoria = m.IdCategoria
        WHERE b.IdContrato = @IdContrato
    ) x
    ORDER BY x.Categoria, x.NumeroSerie;
END
