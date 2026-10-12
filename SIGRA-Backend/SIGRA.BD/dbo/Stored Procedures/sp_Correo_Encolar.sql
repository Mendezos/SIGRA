CREATE PROCEDURE [dbo].[sp_Correo_Encolar]
    @Destinatario NVARCHAR(150),@Nombre NVARCHAR(150),@Asunto NVARCHAR(200),@Cuerpo NVARCHAR(MAX),@AdjuntosJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT CorreoPendiente (Destinatario,Nombre,Asunto,Cuerpo,AdjuntosJson) VALUES (@Destinatario,@Nombre,@Asunto,@Cuerpo,@AdjuntosJson);
    SELECT CONVERT(BIGINT,SCOPE_IDENTITY());
END;
