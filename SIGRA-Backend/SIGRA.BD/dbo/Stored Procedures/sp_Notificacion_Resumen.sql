-- Contadores livianos de la campana del usuario: avisos sin leer y total de avisos (el listado trae máximo 100).
CREATE PROCEDURE [dbo].[sp_Notificacion_Resumen] @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT COUNT(CASE WHEN FechaLectura IS NULL THEN 1 END) AS SinLeer, COUNT(*) AS Total
    FROM Notificacion WHERE IdUsuario = @IdUsuario;
END;