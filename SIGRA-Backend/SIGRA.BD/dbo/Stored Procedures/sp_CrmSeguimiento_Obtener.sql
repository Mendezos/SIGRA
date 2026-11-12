-- Un seguimiento con su historial de cambios (creación, reprogramaciones, cierre).
-- Primer conjunto de resultados: el seguimiento (mismas columnas que sp_CrmSeguimiento_Listar; vacío si no existe).
-- Segundo conjunto: el historial, del más antiguo al más reciente. Las fechas anterior/nueva son hora de Costa Rica;
-- la fecha del movimiento es UTC.
CREATE PROCEDURE [dbo].[sp_CrmSeguimiento_Obtener]
    @IdSeguimiento INT
AS
BEGIN
    SET NOCOUNT ON;

    EXEC dbo.sp_CrmSeguimiento_Listar @IdSeguimiento = @IdSeguimiento;

    SELECT h.IdHistorial, h.IdSeguimiento, h.Accion, h.FechaHoraAnterior, h.FechaHoraNueva, h.Motivo,
           h.IdUsuario, u.Nombre AS Usuario, TODATETIMEOFFSET(h.Fecha, '+00:00') AS Fecha
    FROM SeguimientoHistorial h
    LEFT JOIN Usuario u ON u.IdUsuario = h.IdUsuario
    WHERE h.IdSeguimiento = @IdSeguimiento
    ORDER BY h.Fecha ASC, h.IdHistorial ASC;
END
