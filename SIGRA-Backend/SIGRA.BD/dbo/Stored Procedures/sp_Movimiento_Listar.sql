CREATE PROCEDURE sp_Movimiento_Listar
    @IdEquipo INT = NULL,
    @Tipo     VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (500)
           mv.IdMovimiento, mv.IdEquipo, e.NumeroSerie, m.Marca + ' ' + m.Modelo AS Modelo,
           mv.TipoMovimiento, mv.EstadoAnterior, mv.EstadoNuevo, mv.Fecha, mv.Observacion, mv.Cantidad,
           u.Nombre AS Usuario,
           CASE
               WHEN mv.TipoMovimiento IN ('Compra', 'Devolución de cliente', 'Equipo reparado') THEN 'Entrada'
               WHEN mv.TipoMovimiento IN ('Asignación a contrato', 'Pérdida', 'Baja') THEN 'Salida'
               ELSE 'Cambio de estado'
           END AS Sentido
    FROM MovimientoInventario mv
    INNER JOIN Equipo e ON e.IdEquipo = mv.IdEquipo
    INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    INNER JOIN Usuario u ON u.IdUsuario = mv.IdUsuario
    WHERE (@IdEquipo IS NULL OR mv.IdEquipo = @IdEquipo)
      AND (@Tipo IS NULL OR mv.TipoMovimiento = @Tipo)
    ORDER BY mv.Fecha DESC, mv.IdMovimiento DESC;
END
