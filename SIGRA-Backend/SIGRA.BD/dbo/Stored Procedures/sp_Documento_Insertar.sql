CREATE PROCEDURE sp_Documento_Insertar
    @IdEquipo        INT,
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
    SET XACT_ABORT ON;

    DECLARE @IdDocumento INT;

    BEGIN TRANSACTION;

    INSERT INTO DocumentoTecnico (IdEquipo, NombreDocumento, TipoDocumento, NombreArchivo, TipoContenido, TamanoBytes, Contenido, IdUsuario)
    VALUES (@IdEquipo, @NombreDocumento, @TipoDocumento, @NombreArchivo, @TipoContenido, @TamanoBytes, @Contenido, @IdUsuario);
    SET @IdDocumento = SCOPE_IDENTITY();

    INSERT INTO BitacoraEquipo (IdEquipo, Descripcion)
    VALUES (@IdEquipo, N'Documento técnico adjuntado (' + @TipoDocumento + N'): ' + @NombreDocumento + N'.');

    COMMIT TRANSACTION;

    SELECT @IdDocumento;
END
