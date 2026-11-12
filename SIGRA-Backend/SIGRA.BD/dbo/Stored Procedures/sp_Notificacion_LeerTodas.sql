-- Marca como leídos todos los avisos pendientes del usuario. Devuelve cuántos avisos cambiaron (0 si no había ninguno sin leer).
CREATE PROCEDURE [dbo].[sp_Notificacion_LeerTodas] @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Notificacion SET FechaLectura = SYSUTCDATETIME() WHERE IdUsuario = @IdUsuario AND FechaLectura IS NULL;
    SELECT @@ROWCOUNT AS Marcadas;
END;