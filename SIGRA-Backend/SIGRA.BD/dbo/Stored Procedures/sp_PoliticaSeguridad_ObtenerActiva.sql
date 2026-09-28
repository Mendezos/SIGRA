
CREATE PROCEDURE sp_PoliticaSeguridad_ObtenerActiva
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 IdPolitica, MinutosInactividad, MaxIntentosFallidos, LongitudMinimaPassword,
                  MinutosBloqueo, VigenciaEnlaceMinutos, IdUsuarioCreador, FechaCreacion, Activa
    FROM PoliticaSeguridad
    WHERE Activa = 1;
END