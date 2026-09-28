
CREATE PROCEDURE sp_Auditoria_Insertar
    @IdUsuario INT = NULL,
    @Modulo VARCHAR(50),
    @Entidad VARCHAR(100),
    @IdEntidad INT = NULL,
    @Accion VARCHAR(50),
    @Detalle VARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Auditoria (IdUsuario, Modulo, Entidad, IdEntidad, Accion, Detalle)
    VALUES (@IdUsuario, @Modulo, @Entidad, @IdEntidad, @Accion, @Detalle);
END