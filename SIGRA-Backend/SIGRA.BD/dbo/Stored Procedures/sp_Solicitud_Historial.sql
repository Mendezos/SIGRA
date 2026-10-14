CREATE PROCEDURE sp_Solicitud_Historial
    @IdSolicitud INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Sube hasta la solicitud original de la frecuencia (la que no es renovación de otra).
    DECLARE @Raiz INT = @IdSolicitud, @Padre INT, @Vueltas INT = 0;
    WHILE @Vueltas < 100
    BEGIN
        SET @Padre = NULL;
        SELECT @Padre = IdSolicitudOrigen FROM SolicitudFrecuencia WHERE IdSolicitud = @Raiz;
        IF @Padre IS NULL BREAK;
        SET @Raiz = @Padre;
        SET @Vueltas += 1;
    END

    -- Baja por la cadena de renovaciones: un ciclo por solicitud, en orden cronológico.
    ;WITH Cadena AS (
        SELECT IdSolicitud, 1 AS Ciclo FROM SolicitudFrecuencia WHERE IdSolicitud = @Raiz
        UNION ALL
        SELECT s.IdSolicitud, c.Ciclo + 1
        FROM SolicitudFrecuencia s
        INNER JOIN Cadena c ON s.IdSolicitudOrigen = c.IdSolicitud
    )
    SELECT c.Ciclo, s.IdSolicitud, s.Estado, s.Frecuencia, s.FechaPresentacion, s.FechaOtorgamiento,
           s.NumeroResolucion, s.FechaVencimiento, s.IdSolicitudOrigen,
           CAST(CASE WHEN s.IdSolicitud = @IdSolicitud THEN 1 ELSE 0 END AS BIT) AS EsActual
    FROM Cadena c
    INNER JOIN SolicitudFrecuencia s ON s.IdSolicitud = c.IdSolicitud
    ORDER BY c.Ciclo
    OPTION (MAXRECURSION 100);
END
