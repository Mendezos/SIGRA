CREATE PROCEDURE sp_Checklist_Guardar
    @IdEquipo       INT,
    @IdsCumplidos   VARCHAR(MAX) = NULL,   -- ids de requisito cumplidos separados por coma; el resto queda como no cumplido
    @Observaciones  VARCHAR(MAX) = NULL,
    @IdUsuario      INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Cumplidos TABLE (IdRequisito INT PRIMARY KEY);
    INSERT INTO @Cumplidos (IdRequisito)
    SELECT DISTINCT CAST(value AS INT) FROM STRING_SPLIT(ISNULL(@IdsCumplidos, ''), ',') WHERE LTRIM(RTRIM(value)) <> '';

    DECLARE @Pendientes INT = (
        SELECT COUNT(*) FROM RequisitoInstalacion r
        WHERE r.Activo = 1 AND NOT EXISTS (SELECT 1 FROM @Cumplidos c WHERE c.IdRequisito = r.IdRequisito));
    DECLARE @Completado BIT = CASE WHEN @Pendientes = 0 THEN 1 ELSE 0 END;
    DECLARE @IdChecklist INT;

    BEGIN TRANSACTION;

    INSERT INTO ChecklistInstalacion (IdEquipo, Completado, Observaciones, IdUsuario)
    VALUES (@IdEquipo, @Completado, @Observaciones, @IdUsuario);
    SET @IdChecklist = SCOPE_IDENTITY();

    INSERT INTO ChecklistInstalacionItem (IdChecklist, IdRequisito, Cumplido)
    SELECT @IdChecklist, r.IdRequisito, CASE WHEN c.IdRequisito IS NULL THEN 0 ELSE 1 END
    FROM RequisitoInstalacion r
    LEFT JOIN @Cumplidos c ON c.IdRequisito = r.IdRequisito
    WHERE r.Activo = 1;

    INSERT INTO BitacoraEquipo (IdEquipo, Descripcion)
    VALUES (@IdEquipo, CASE WHEN @Completado = 1
        THEN N'Checklist previo a la instalación completo: la repetidora quedó lista para instalación.'
        ELSE N'Checklist previo a la instalación incompleto: ' + CAST(@Pendientes AS NVARCHAR(10)) + N' requisito(s) pendiente(s).' END);

    COMMIT TRANSACTION;

    SELECT @IdChecklist;
END
