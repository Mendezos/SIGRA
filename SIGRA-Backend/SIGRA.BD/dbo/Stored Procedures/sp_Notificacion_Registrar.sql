-- Registra un aviso en la campana del usuario y, si @EnviarCorreo = 1, deja el correo en la cola (CorreoPendiente).
-- @Tipo clasifica el aviso (General, Ticket, Seguimiento, Bateria, ContactoSinVendedor, Contrato, Frecuencia...).
-- @ClaveUnica evita duplicados: si el usuario ya tiene un aviso con esa clave no se crea otro ni se encola otro correo
-- (así los procesos automáticos pueden repetirse sin llenar la campana). @IdNotificacion devuelve el aviso creado, o 0 si ya existía.
-- No devuelve conjuntos de resultados: la llaman por EXEC otros procedimientos (tickets) y no deben ver filas extra.
CREATE PROCEDURE [dbo].[sp_Notificacion_Registrar]
    @IdUsuario INT, @IdModulo INT, @Titulo NVARCHAR(200), @Mensaje NVARCHAR(MAX),
    @Entidad NVARCHAR(100) = NULL, @IdEntidad INT = NULL, @EnviarCorreo BIT = 1,
    @Tipo VARCHAR(40) = 'General', @ClaveUnica NVARCHAR(150) = NULL,
    @IdNotificacion BIGINT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @IdNotificacion = 0;

    IF @ClaveUnica IS NOT NULL AND EXISTS (SELECT 1 FROM Notificacion WHERE IdUsuario = @IdUsuario AND ClaveUnica = @ClaveUnica)
        RETURN;

    BEGIN TRY
        INSERT Notificacion (IdUsuario, IdModulo, Titulo, Mensaje, Entidad, IdEntidad, Tipo, ClaveUnica)
        VALUES (@IdUsuario, @IdModulo, @Titulo, @Mensaje, @Entidad, @IdEntidad, ISNULL(@Tipo, 'General'), @ClaveUnica);
    END TRY
    BEGIN CATCH
        -- Otro proceso registró el mismo aviso en este instante (índice único de ClaveUnica): no es un error.
        IF ERROR_NUMBER() IN (2601, 2627) RETURN;
        THROW;
    END CATCH;

    SET @IdNotificacion = SCOPE_IDENTITY();

    IF @EnviarCorreo = 1
        INSERT CorreoPendiente (IdNotificacion, Destinatario, Nombre, Asunto, Cuerpo)
        SELECT @IdNotificacion, Correo, Nombre, @Titulo, @Mensaje FROM Usuario WHERE IdUsuario = @IdUsuario AND Activo = 1;
END;
