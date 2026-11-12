-- Crea los recordatorios de baterías de una factura (CRMGPSC-025). Lo llama el módulo de facturación al emitir una factura.
-- Recorre las líneas con EsBateria = 1 y crea un recordatorio por cada batería distinta (las líneas del mismo modelo o descripción se
-- suman en una sola compra, porque dos compras idénticas el mismo día se cerrarían entre sí como "cambio anticipado"):
--   cliente = el de la factura, fecha de compra = Factura.Fecha, modelo = IdModelo (si es una batería del catálogo) y Descripcion,
--   vendedor = Factura.IdVendedor, o el vendedor del cliente, o @IdUsuario si es un vendedor activo (el primero que esté activo).
-- Es idempotente: si la factura ya generó el recordatorio de esa batería, no lo duplica (Resultado = 'Existente').
-- Reutiliza el "cambio anticipado" de sp_CrmBateria_Crear. Una línea que no se puede convertir (cantidad no entera, cliente inactivo,
-- sin vendedor activo, factura anulada...) se informa como 'Omitido' con su motivo y no detiene a las demás.
-- Devuelve una fila por batería: IdFactura, NumeroFactura, IdModelo, ModeloBateria, Cantidad, IdRecordatorio, Resultado, Motivo.
CREATE PROCEDURE [dbo].[sp_CrmBateria_RegistrarDesdeFactura]
    @IdFactura  INT,
    @IdUsuario  INT = NULL,
    @MesesAviso INT = 11
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IdCliente INT, @Fecha DATE, @Estado VARCHAR(15), @IdVendedorFactura INT, @NumeroFactura VARCHAR(30);
    SELECT @IdCliente = IdCliente, @Fecha = Fecha, @Estado = Estado, @IdVendedorFactura = IdVendedor, @NumeroFactura = NumeroFactura
    FROM Factura WHERE IdFactura = @IdFactura;

    IF @IdCliente IS NULL THROW 50001, N'La factura indicada no existe.', 1;

    -- Vendedor responsable: el de la factura, si no el del cliente, si no quien registra (siempre que sea un vendedor activo).
    DECLARE @IdVendedorCliente INT, @IdVendedor INT;
    SELECT @IdVendedorCliente = IdVendedor FROM Cliente WHERE IdCliente = @IdCliente;
    SELECT TOP (1) @IdVendedor = u.IdUsuario
    FROM Usuario u
    INNER JOIN Rol r ON r.IdRol = u.IdRol
    INNER JOIN (VALUES (1, @IdVendedorFactura), (2, @IdVendedorCliente), (3, @IdUsuario)) AS c (Prioridad, IdUsuario) ON c.IdUsuario = u.IdUsuario
    WHERE u.Activo = 1 AND r.Nombre = 'Vendedor / Ejecutivo de cuenta'
    ORDER BY c.Prioridad;

    DECLARE @Grupos TABLE (
        Id INT IDENTITY (1, 1) PRIMARY KEY,
        IdModelo INT NULL,
        Descripcion VARCHAR(150) NOT NULL,
        Cantidad DECIMAL (12, 2) NOT NULL
    );

    -- Una fila por batería: por modelo del catálogo (categoría Batería) o, si no tiene, por descripción sin distinguir tildes ni mayúsculas.
    INSERT @Grupos (IdModelo, Descripcion, Cantidad)
    SELECT x.IdModelo, MIN(x.Descripcion), SUM(x.Cantidad)
    FROM (
        SELECT CASE WHEN m.IdModelo IS NOT NULL THEN l.IdModelo END AS IdModelo,
               LEFT(LTRIM(RTRIM(l.Descripcion)), 150) AS Descripcion,
               CASE WHEN m.IdModelo IS NULL THEN LEFT(LTRIM(RTRIM(l.Descripcion)), 150) COLLATE Latin1_General_CI_AI ELSE '' END AS Clave,
               l.Cantidad
        FROM FacturaLinea l
        LEFT JOIN (
            SELECT mo.IdModelo FROM ModeloEquipo mo
            INNER JOIN CategoriaEquipo ca ON ca.IdCategoria = mo.IdCategoria
            WHERE ca.Nombre COLLATE Latin1_General_CI_AI = 'Bateria'
        ) m ON m.IdModelo = l.IdModelo
        WHERE l.IdFactura = @IdFactura AND l.EsBateria = 1
    ) x
    GROUP BY x.IdModelo, x.Clave;

    DECLARE @Resultado TABLE (
        Orden INT IDENTITY (1, 1),
        IdModelo INT NULL,
        ModeloBateria VARCHAR(150) NOT NULL,
        Cantidad DECIMAL (12, 2) NOT NULL,
        IdRecordatorio INT NULL,
        Resultado VARCHAR(10) NOT NULL,
        Motivo NVARCHAR(300) NULL
    );

    DECLARE @I INT = 1, @N INT = (SELECT COUNT(*) FROM @Grupos);
    DECLARE @IdModelo INT, @Descripcion VARCHAR(150), @Cantidad DECIMAL (12, 2), @IdExistente INT, @IdNuevo INT, @Omitido NVARCHAR(300), @CantidadEntera INT;

    BEGIN TRANSACTION;

    WHILE @I <= @N
    BEGIN
        SELECT @IdModelo = IdModelo, @Descripcion = Descripcion, @Cantidad = Cantidad FROM @Grupos WHERE Id = @I;
        SET @IdExistente = NULL; SET @IdNuevo = NULL; SET @Omitido = NULL;

        SELECT TOP (1) @IdExistente = r.IdRecordatorio
        FROM RecordatorioBateria r
        WHERE r.IdFactura = @IdFactura
          AND ((@IdModelo IS NOT NULL AND r.IdModelo = @IdModelo) OR r.ModeloBateria COLLATE Latin1_General_CI_AI = @Descripcion)
        ORDER BY r.IdRecordatorio;

        IF @IdExistente IS NOT NULL
            INSERT @Resultado (IdModelo, ModeloBateria, Cantidad, IdRecordatorio, Resultado, Motivo)
            VALUES (@IdModelo, @Descripcion, @Cantidad, @IdExistente, 'Existente', N'La factura ya generó este recordatorio.');
        ELSE IF @Estado = 'Anulada'
            INSERT @Resultado (IdModelo, ModeloBateria, Cantidad, Resultado, Motivo)
            VALUES (@IdModelo, @Descripcion, @Cantidad, 'Omitido', N'La factura está anulada.');
        ELSE IF @Cantidad <> FLOOR(@Cantidad) OR @Cantidad < 1
            INSERT @Resultado (IdModelo, ModeloBateria, Cantidad, Resultado, Motivo)
            VALUES (@IdModelo, @Descripcion, @Cantidad, 'Omitido', N'La cantidad debe ser un número entero mayor o igual a 1.');
        ELSE IF @IdVendedor IS NULL
            INSERT @Resultado (IdModelo, ModeloBateria, Cantidad, Resultado, Motivo)
            VALUES (@IdModelo, @Descripcion, @Cantidad, 'Omitido', N'No hay un vendedor activo para asignar el recordatorio.');
        ELSE
        BEGIN
            SET @CantidadEntera = CONVERT(INT, @Cantidad);
            EXEC dbo.sp_CrmBateria_Crear
                @IdCliente = @IdCliente, @IdFactura = @IdFactura, @NumeroFactura = @NumeroFactura,
                @IdModelo = @IdModelo, @ModeloBateria = @Descripcion, @Cantidad = @CantidadEntera, @FechaCompra = @Fecha,
                @IdVendedor = @IdVendedor, @IdUsuario = @IdUsuario, @MesesAviso = @MesesAviso, @Estricto = 0,
                @IdRecordatorio = @IdNuevo OUTPUT, @Omitido = @Omitido OUTPUT;

            INSERT @Resultado (IdModelo, ModeloBateria, Cantidad, IdRecordatorio, Resultado, Motivo)
            VALUES (@IdModelo, @Descripcion, @Cantidad, @IdNuevo, CASE WHEN @IdNuevo IS NULL THEN 'Omitido' ELSE 'Creado' END, @Omitido);
        END;

        SET @I += 1;
    END;

    COMMIT TRANSACTION;

    SELECT @IdFactura AS IdFactura, @NumeroFactura AS NumeroFactura, IdModelo, ModeloBateria, Cantidad, IdRecordatorio, Resultado, Motivo
    FROM @Resultado
    ORDER BY Orden;
END
