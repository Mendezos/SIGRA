CREATE PROCEDURE sp_SolicitudDocumento_Insertar
    @IdSolicitud     INT,
    @TipoDocumento   VARCHAR(30),
    @NombreDocumento VARCHAR(150),
    @NombreArchivo   VARCHAR(255),
    @TipoContenido   VARCHAR(100),
    @TamanoBytes     INT,
    @Contenido       VARBINARY(MAX),
    @IdUsuario       INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO DocumentoFrecuencia (IdSolicitud, NombreDocumento, TipoDocumento, NombreArchivo, TipoContenido, TamanoBytes, Contenido, IdUsuario)
    VALUES (@IdSolicitud, @NombreDocumento, @TipoDocumento, @NombreArchivo, @TipoContenido, @TamanoBytes, @Contenido, @IdUsuario);

    SELECT SCOPE_IDENTITY();
END
