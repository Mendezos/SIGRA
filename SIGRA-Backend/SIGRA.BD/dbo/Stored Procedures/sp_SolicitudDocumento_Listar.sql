CREATE PROCEDURE sp_SolicitudDocumento_Listar
    @IdSolicitud INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Solo metadatos: el contenido se descarga con sp_SolicitudDocumento_Obtener.
    SELECT d.IdDocumento, d.IdSolicitud, ISNULL(d.TipoDocumento, 'Otro') AS TipoDocumento, d.NombreDocumento,
           d.NombreArchivo, d.TipoContenido, d.TamanoBytes, d.FechaCarga, u.Nombre AS Usuario
    FROM DocumentoFrecuencia d
    LEFT JOIN Usuario u ON u.IdUsuario = d.IdUsuario
    WHERE d.IdSolicitud = @IdSolicitud AND d.Contenido IS NOT NULL
    ORDER BY d.FechaCarga DESC, d.IdDocumento DESC;
END
