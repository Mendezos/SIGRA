CREATE TRIGGER dbo.trg_Auditoria_SoloLectura
ON dbo.Auditoria
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50001, N'La bitácora de auditoría es de solo lectura: sus eventos no se pueden modificar ni eliminar, para preservar la trazabilidad.', 1;
END
