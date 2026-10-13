CREATE PROCEDURE sp_Documento_Listar
    @IdEquipo INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Solo metadatos: el contenido se descarga con sp_Documento_Obtener.
    SELECT d.IdDocumento, d.IdEquipo, ISNULL(d.TipoDocumento, 'Otro') AS TipoDocumento, d.NombreDocumento,
           d.NombreArchivo, d.TipoContenido, d.TamanoBytes, d.FechaCarga, u.Nombre AS Usuario
    FROM DocumentoTecnico d
    LEFT JOIN Usuario u ON u.IdUsuario = d.IdUsuario
    WHERE d.IdEquipo = @IdEquipo AND d.Contenido IS NOT NULL
    ORDER BY d.FechaCarga DESC, d.IdDocumento DESC;
END
