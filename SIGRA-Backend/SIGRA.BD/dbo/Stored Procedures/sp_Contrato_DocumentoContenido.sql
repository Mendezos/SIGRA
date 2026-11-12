CREATE PROCEDURE sp_Contrato_DocumentoContenido
    @IdContrato  INT,
    @IdDocumento INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT d.Nombre, d.Contenido
    FROM ContratoDocumento d
    WHERE d.IdContrato = @IdContrato AND d.IdDocumento = @IdDocumento;
END
