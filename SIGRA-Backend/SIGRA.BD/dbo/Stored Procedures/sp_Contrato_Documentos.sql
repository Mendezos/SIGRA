-- Documentos firmados del contrato (sin el contenido del archivo).
CREATE PROCEDURE sp_Contrato_Documentos
    @IdContrato INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT d.IdDocumento, d.Tipo, d.Nombre, d.FechaFirma, u.Nombre AS Usuario, d.Fecha, DATALENGTH(d.Contenido) AS Bytes
    FROM ContratoDocumento d
    INNER JOIN Usuario u ON u.IdUsuario = d.IdUsuario
    WHERE d.IdContrato = @IdContrato
    ORDER BY d.IdDocumento DESC;
END
