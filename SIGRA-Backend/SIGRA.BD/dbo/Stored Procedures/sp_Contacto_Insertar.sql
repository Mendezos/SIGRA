CREATE PROCEDURE sp_Contacto_Insertar
    @Empresa           VARCHAR(150),
    @Contacto          VARCHAR(150) = NULL,
    @MedioContacto     VARCHAR(20),
    @DatoContacto      VARCHAR(150),
    @Motivo            VARCHAR(500) = NULL,
    @IdVendedor        INT = NULL,
    @MotivoAsignacion  VARCHAR(300) = NULL,
    @IdUsuario         INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IdContacto INT;

    BEGIN TRANSACTION;

    INSERT INTO ContactoInicial (Empresa, Contacto, MedioContacto, DatoContacto, Motivo, IdVendedor, Estado, IdUsuarioRegistra)
    VALUES (@Empresa, @Contacto, @MedioContacto, @DatoContacto, @Motivo, @IdVendedor,
            CASE WHEN @IdVendedor IS NULL THEN 'En espera' ELSE 'Asignado' END, @IdUsuario);
    SET @IdContacto = SCOPE_IDENTITY();

    IF @IdVendedor IS NOT NULL
        INSERT INTO ContactoHistorial (IdContacto, IdUsuario, IdVendedorAnterior, IdVendedorNuevo, Motivo)
        VALUES (@IdContacto, @IdUsuario, NULL, @IdVendedor, ISNULL(@MotivoAsignacion, 'Asignación inicial'));

    COMMIT TRANSACTION;

    SELECT @IdContacto AS IdContacto;
END
