CREATE PROCEDURE [dbo].[sp_Notificacion_Leer] @IdNotificacion BIGINT,@IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM Notificacion WHERE IdNotificacion=@IdNotificacion AND IdUsuario=@IdUsuario)
        THROW 50001, 'La notificación no existe.', 1;
    UPDATE Notificacion SET FechaLectura=COALESCE(FechaLectura,SYSUTCDATETIME()) WHERE IdNotificacion=@IdNotificacion AND IdUsuario=@IdUsuario;
END;
