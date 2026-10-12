CREATE PROCEDURE [dbo].[sp_Notificacion_Registrar]
    @IdUsuario INT, @IdModulo INT, @Titulo NVARCHAR(200), @Mensaje NVARCHAR(MAX),
    @Entidad NVARCHAR(100) = NULL, @IdEntidad INT = NULL, @EnviarCorreo BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    INSERT Notificacion (IdUsuario,IdModulo,Titulo,Mensaje,Entidad,IdEntidad)
    VALUES (@IdUsuario,@IdModulo,@Titulo,@Mensaje,@Entidad,@IdEntidad);
    DECLARE @Id BIGINT = SCOPE_IDENTITY();
    IF @EnviarCorreo = 1
        INSERT CorreoPendiente (IdNotificacion,Destinatario,Nombre,Asunto,Cuerpo)
        SELECT @Id, Correo, Nombre, @Titulo, @Mensaje FROM Usuario WHERE IdUsuario = @IdUsuario AND Activo = 1;
END;
