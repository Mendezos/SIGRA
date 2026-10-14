CREATE PROCEDURE [dbo].[sp_Correo_Finalizar] @IdCorreo BIGINT,@Enviado BIT,@Error NVARCHAR(500)=NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE CorreoPendiente
    SET Estado=CASE WHEN @Enviado=1 THEN 'Enviado' WHEN Intentos>=5 THEN 'Fallido' ELSE 'Pendiente' END,
        FechaEnvio=CASE WHEN @Enviado=1 THEN SYSUTCDATETIME() ELSE NULL END,
        BloqueadoHasta=NULL,UltimoError=@Error,
        ProximoIntento=DATEADD(SECOND,CONVERT(INT,60*POWER(2,CASE WHEN Intentos>5 THEN 5 ELSE Intentos-1 END)),SYSUTCDATETIME())
    WHERE IdCorreo=@IdCorreo AND Estado='Procesando';
END;
