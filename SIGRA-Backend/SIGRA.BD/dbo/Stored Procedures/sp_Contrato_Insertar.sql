-- Crea un contrato en estado Borrador: guarda los datos acordados y la lista de equipos y accesorios,
-- pero no asigna ni reserva nada hasta que se active con el documento firmado (sp_Contrato_Activar).
CREATE PROCEDURE sp_Contrato_Insertar
    @Empresa           VARCHAR(150),
    @Contacto          VARCHAR(150) = NULL,
    @Telefono          VARCHAR(20) = NULL,
    @Correo            VARCHAR(150) = NULL,
    @Direccion         VARCHAR(300) = NULL,
    @IdPlantilla       INT = NULL,
    @VersionPlantilla  INT = NULL,
    @FechaInicio       DATE,
    @FechaVencimiento  DATE,
    @FechaFirma        DATE = NULL,
    @MontoMensual      DECIMAL(12, 2),
    @Moneda            CHAR(3) = 'CRC',
    @Condiciones       VARCHAR(MAX) = NULL,
    @ClausulasAdicionales VARCHAR(MAX) = NULL,
    @Responsabilidades VARCHAR(MAX) = NULL,
    @Penalizacion      VARCHAR(MAX) = NULL,
    @IdVendedor        INT = NULL,
    @IdsEquipo         VARCHAR(MAX),
    @IdUsuario         INT,
    @AccesoriosJson    NVARCHAR(MAX) = NULL,
    @CubreReparaciones BIT = 0,
    @IdContratoOrigen  INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IdCliente INT, @IdContrato INT;
    DECLARE @Equipos TABLE (IdEquipo INT PRIMARY KEY);

    INSERT INTO @Equipos (IdEquipo)
    SELECT DISTINCT CAST(value AS INT) FROM STRING_SPLIT(@IdsEquipo, ',') WHERE LTRIM(RTRIM(value)) <> '';

    BEGIN TRANSACTION;

    SELECT @IdCliente = IdCliente FROM Cliente WHERE Empresa = @Empresa;
    IF @IdCliente IS NULL
    BEGIN
        INSERT INTO Cliente (Empresa, Contacto, Telefono, Correo, Direccion) VALUES (@Empresa, @Contacto, @Telefono, @Correo, @Direccion);
        SET @IdCliente = SCOPE_IDENTITY();
    END
    ELSE
        UPDATE Cliente SET Contacto = ISNULL(@Contacto, Contacto), Telefono = ISNULL(@Telefono, Telefono),
                           Correo = ISNULL(@Correo, Correo), Direccion = ISNULL(@Direccion, Direccion)
        WHERE IdCliente = @IdCliente;

    INSERT INTO Contrato (IdCliente, Estado, FechaInicio, FechaVencimiento, MontoMensual, Condiciones, IdVendedor, CubreReparaciones,
                          IdPlantilla, VersionPlantilla, Moneda, FechaFirma, ClausulasAdicionales, Responsabilidades, Penalizacion, IdContratoOrigen)
    VALUES (@IdCliente, 'Borrador', @FechaInicio, @FechaVencimiento, @MontoMensual, @Condiciones, @IdVendedor, @CubreReparaciones,
            @IdPlantilla, @VersionPlantilla, @Moneda, @FechaFirma, @ClausulasAdicionales, @Responsabilidades, @Penalizacion, @IdContratoOrigen);
    SET @IdContrato = SCOPE_IDENTITY();

    INSERT INTO ContratoEquipoBorrador (IdContrato, IdEquipo) SELECT @IdContrato, IdEquipo FROM @Equipos;

    EXEC sp_ContratoAccesorio_Aplicar @IdContrato = @IdContrato, @ItemsJson = @AccesoriosJson, @Descontar = 0;

    COMMIT TRANSACTION;

    SELECT @IdContrato AS IdContrato;
END
