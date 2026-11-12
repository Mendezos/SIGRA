-- Reemplaza los datos de un contrato mientras siga en Borrador. Los valores anteriores se registran desde el flujo.
CREATE PROCEDURE sp_Contrato_EditarBorrador
    @IdContrato        INT,
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
    @AccesoriosJson    NVARCHAR(MAX) = NULL,
    @CubreReparaciones BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IdCliente INT, @Estado VARCHAR(30);
    DECLARE @Equipos TABLE (IdEquipo INT PRIMARY KEY);

    INSERT INTO @Equipos (IdEquipo)
    SELECT DISTINCT CAST(value AS INT) FROM STRING_SPLIT(@IdsEquipo, ',') WHERE LTRIM(RTRIM(value)) <> '';

    BEGIN TRANSACTION;

    SELECT @Estado = Estado FROM Contrato WITH (UPDLOCK) WHERE IdContrato = @IdContrato;
    IF @Estado IS NULL THROW 50001, 'El contrato indicado no existe.', 1;
    IF @Estado <> 'Borrador'
        THROW 50001, 'Solo se pueden editar contratos en borrador. Para cambiar un contrato vigente use la renovación.', 1;

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

    UPDATE Contrato
    SET IdCliente = @IdCliente, FechaInicio = @FechaInicio, FechaVencimiento = @FechaVencimiento, FechaFirma = @FechaFirma,
        MontoMensual = @MontoMensual, Moneda = @Moneda, Condiciones = @Condiciones, ClausulasAdicionales = @ClausulasAdicionales,
        Responsabilidades = @Responsabilidades, Penalizacion = @Penalizacion, IdVendedor = @IdVendedor, CubreReparaciones = @CubreReparaciones,
        IdPlantilla = @IdPlantilla, VersionPlantilla = @VersionPlantilla
    WHERE IdContrato = @IdContrato;

    DELETE FROM ContratoEquipoBorrador WHERE IdContrato = @IdContrato;
    INSERT INTO ContratoEquipoBorrador (IdContrato, IdEquipo) SELECT @IdContrato, IdEquipo FROM @Equipos;

    EXEC sp_ContratoAccesorio_Aplicar @IdContrato = @IdContrato, @ItemsJson = @AccesoriosJson, @Descontar = 0;

    COMMIT TRANSACTION;
END
