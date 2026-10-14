CREATE PROCEDURE sp_Frecuencia_RepetidorasCliente
    @IdCliente INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Repetidoras del módulo de alquiler cuyo contrato más reciente pertenece al cliente.
    SELECT e.IdEquipo, e.NumeroSerie, m.Marca, m.Modelo, ce.IdContrato, ct.Estado AS EstadoContrato
    FROM Equipo e
    INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    INNER JOIN CategoriaEquipo cat ON cat.IdCategoria = m.IdCategoria
    INNER JOIN ContratoEquipo ce ON ce.IdEquipo = e.IdEquipo
        AND ce.IdContratoEquipo = (SELECT MAX(x.IdContratoEquipo) FROM ContratoEquipo x WHERE x.IdEquipo = e.IdEquipo)
    INNER JOIN Contrato ct ON ct.IdContrato = ce.IdContrato
    WHERE cat.Nombre = N'Repetidora' AND ct.IdCliente = @IdCliente
    ORDER BY e.NumeroSerie;
END
