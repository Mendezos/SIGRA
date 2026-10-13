CREATE PROCEDURE sp_Documento_Obtener
    @IdDocumento INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT d.IdDocumento, d.IdEquipo, d.NombreDocumento, d.NombreArchivo, d.TipoContenido, d.Contenido
    FROM DocumentoTecnico d
    WHERE d.IdDocumento = @IdDocumento AND d.Contenido IS NOT NULL;
END
