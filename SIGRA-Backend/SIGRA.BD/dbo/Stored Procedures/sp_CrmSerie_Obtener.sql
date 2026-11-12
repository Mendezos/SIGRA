-- Una serie de contactos periódicos con todos sus seguimientos.
-- Primer conjunto de resultados: la serie (mismas columnas que sp_CrmSerie_Listar; vacío si no existe).
-- Segundo conjunto: sus seguimientos por fecha (mismas columnas que sp_CrmSeguimiento_Listar).
CREATE PROCEDURE [dbo].[sp_CrmSerie_Obtener]
    @IdSerie INT
AS
BEGIN
    SET NOCOUNT ON;

    EXEC dbo.sp_CrmSerie_Listar @IdSerie = @IdSerie;
    EXEC dbo.sp_CrmSeguimiento_Listar @IdSerie = @IdSerie;
END
