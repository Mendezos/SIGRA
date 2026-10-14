CREATE PROCEDURE [dbo].[sp_Notificacion_Consultar] @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP (100) n.IdNotificacion,n.Titulo,n.Mensaje,n.IdModulo,n.Entidad,n.IdEntidad,
           TODATETIMEOFFSET(n.Fecha,'+00:00') AS Fecha,TODATETIMEOFFSET(n.FechaLectura,'+00:00') AS FechaLectura,
           correo.Estado AS EstadoCorreo
    FROM Notificacion n OUTER APPLY (SELECT TOP (1) Estado FROM CorreoPendiente c WHERE c.IdNotificacion=n.IdNotificacion ORDER BY c.IdCorreo DESC) correo
    WHERE n.IdUsuario=@IdUsuario ORDER BY n.FechaLectura,n.Fecha DESC,n.IdNotificacion DESC;
END;
