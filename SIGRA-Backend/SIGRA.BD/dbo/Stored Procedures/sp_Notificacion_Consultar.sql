-- Avisos de la campana del usuario: primero los no leídos y luego los leídos, de lo más reciente a lo más antiguo (máximo 100).
-- Tipo: los avisos de tickets nacieron con el tipo por defecto (General); aquí se reconocen por su entidad para que la campana los clasifique.
CREATE PROCEDURE [dbo].[sp_Notificacion_Consultar] @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP (100) n.IdNotificacion,n.Titulo,n.Mensaje,n.IdModulo,n.Entidad,n.IdEntidad,
           CASE WHEN n.Tipo = 'General' AND n.Entidad = N'Ticket' THEN 'Ticket' ELSE n.Tipo END AS Tipo,
           TODATETIMEOFFSET(n.Fecha,'+00:00') AS Fecha,TODATETIMEOFFSET(n.FechaLectura,'+00:00') AS FechaLectura,
           correo.Estado AS EstadoCorreo
    FROM Notificacion n OUTER APPLY (SELECT TOP (1) Estado FROM CorreoPendiente c WHERE c.IdNotificacion=n.IdNotificacion ORDER BY c.IdCorreo DESC) correo
    WHERE n.IdUsuario=@IdUsuario
    ORDER BY CASE WHEN n.FechaLectura IS NULL THEN 0 ELSE 1 END,n.Fecha DESC,n.IdNotificacion DESC;
END;