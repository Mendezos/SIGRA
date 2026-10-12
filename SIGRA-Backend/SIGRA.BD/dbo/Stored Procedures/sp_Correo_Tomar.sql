CREATE PROCEDURE [dbo].[sp_Correo_Tomar] @IdCorreo BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    DECLARE @Ahora DATETIME2=SYSUTCDATETIME();
    ;WITH siguiente AS (
        SELECT TOP (1) * FROM CorreoPendiente WITH (UPDLOCK,READPAST,ROWLOCK)
        WHERE (@IdCorreo IS NULL OR IdCorreo=@IdCorreo)
          AND ((Estado='Pendiente' AND ProximoIntento<=@Ahora) OR (Estado='Procesando' AND BloqueadoHasta<@Ahora))
        ORDER BY ProximoIntento,IdCorreo
    )
    UPDATE siguiente SET Estado='Procesando',Intentos=Intentos+1,BloqueadoHasta=DATEADD(MINUTE,5,@Ahora)
    OUTPUT inserted.IdCorreo,inserted.Destinatario,inserted.Nombre,inserted.Asunto,inserted.Cuerpo,inserted.AdjuntosJson,inserted.Intentos;
END;
