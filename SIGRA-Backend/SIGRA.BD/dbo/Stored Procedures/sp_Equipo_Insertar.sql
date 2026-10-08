CREATE PROCEDURE sp_Equipo_Insertar
    @IdCategoria        INT,
    @Marca              VARCHAR(100),
    @Modelo             VARCHAR(100),
    @DescripcionTecnica VARCHAR(MAX) = NULL,
    @IdProveedor        INT,
    @NumeroSerie        VARCHAR(50),
    @Propietario        VARCHAR(100),
    @Ubicacion          VARCHAR(150) = NULL,
    @FechaAdquisicion   DATE,
    @CostoCompra        DECIMAL(12, 2),
    @Foto               VARCHAR(MAX) = NULL,
    @Cantidad           INT = 1,
    @IdUsuario          INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IdModelo INT, @IdEquipo INT;

    BEGIN TRANSACTION;

    SELECT @IdModelo = IdModelo
    FROM ModeloEquipo
    WHERE IdCategoria = @IdCategoria AND Marca = @Marca AND Modelo = @Modelo;

    IF @IdModelo IS NULL
    BEGIN
        INSERT INTO ModeloEquipo (IdCategoria, Marca, Modelo, DescripcionTecnica)
        VALUES (@IdCategoria, @Marca, @Modelo, @DescripcionTecnica);
        SET @IdModelo = SCOPE_IDENTITY();
    END
    ELSE IF @DescripcionTecnica IS NOT NULL
    BEGIN
        UPDATE ModeloEquipo SET DescripcionTecnica = @DescripcionTecnica WHERE IdModelo = @IdModelo;
    END

    INSERT INTO Equipo (IdModelo, IdProveedor, NumeroSerie, Estado, Propietario, Ubicacion, FechaAdquisicion, CostoCompra, Foto, Cantidad)
    VALUES (@IdModelo, @IdProveedor, @NumeroSerie, 'Disponible', @Propietario, @Ubicacion, @FechaAdquisicion, @CostoCompra, @Foto, @Cantidad);
    SET @IdEquipo = SCOPE_IDENTITY();

    INSERT INTO MovimientoInventario (IdEquipo, IdUsuario, TipoMovimiento, EstadoAnterior, EstadoNuevo, Observacion, Cantidad)
    VALUES (@IdEquipo, @IdUsuario, 'Compra', NULL, 'Disponible', 'Alta del equipo en el inventario', @Cantidad);

    INSERT INTO BitacoraEquipo (IdEquipo, Descripcion)
    VALUES (@IdEquipo, 'Equipo registrado en el inventario con estado Disponible.');

    COMMIT TRANSACTION;

    SELECT @IdEquipo AS IdEquipo;
END
