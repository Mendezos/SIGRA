CREATE PROCEDURE sp_SolicitudDocumento_Obtener
    @IdDocumento INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT d.IdDocumento, d.IdSolicitud, d.NombreDocumento, d.NombreArchivo, d.TipoContenido, d.Contenido
    FROM DocumentoFrecuencia d
    WHERE d.IdDocumento = @IdDocumento AND d.Contenido IS NOT NULL;
END
