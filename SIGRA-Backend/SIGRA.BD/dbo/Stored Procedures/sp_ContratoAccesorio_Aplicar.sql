-- Deja los accesorios de un contrato como indica @ItemsJson y mueve el stock de bodega en la misma transacción:
-- lo que se agrega sale de bodega y lo que se quita regresa. Debe llamarse dentro de una transacción.
CREATE PROCEDURE sp_ContratoAccesorio_Aplicar
    @IdContrato INT,
    @ItemsJson  NVARCHAR(MAX),
    @Descontar  BIT = 1   -- 0 = contrato en borrador: se guarda la lista sin mover el stock de bodega
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Descontar = 0
    BEGIN
        DELETE FROM ContratoAccesorio WHERE IdContrato = @IdContrato;
        INSERT INTO ContratoAccesorio (IdContrato, IdAccesorioModelo, Cantidad, DescontadoDeStock)
        SELECT @IdContrato, j.IdAccesorioModelo, SUM(j.Cantidad), 0
        FROM OPENJSON(ISNULL(@ItemsJson, '[]'))
             WITH (IdAccesorioModelo INT '$.idAccesorioModelo', Cantidad INT '$.cantidad') j
        GROUP BY j.IdAccesorioModelo;
        RETURN;
    END

    DECLARE @Nuevo TABLE (IdAccesorioModelo INT PRIMARY KEY, Cantidad INT NOT NULL);
    INSERT INTO @Nuevo (IdAccesorioModelo, Cantidad)
    SELECT j.IdAccesorioModelo, SUM(j.Cantidad)
    FROM OPENJSON(ISNULL(@ItemsJson, '[]'))
         WITH (IdAccesorioModelo INT '$.idAccesorioModelo', Cantidad INT '$.cantidad') j
    GROUP BY j.IdAccesorioModelo;

    -- Diferencia contra lo que el contrato ya tenía descontado: positivo = sale de bodega, negativo = regresa.
    DECLARE @Diferencia TABLE (IdAccesorioModelo INT PRIMARY KEY, Delta INT NOT NULL);
    INSERT INTO @Diferencia (IdAccesorioModelo, Delta)
    SELECT COALESCE(n.IdAccesorioModelo, c.IdAccesorioModelo), ISNULL(n.Cantidad, 0) - ISNULL(c.Cantidad, 0)
    FROM @Nuevo n
    FULL JOIN (SELECT IdAccesorioModelo, Cantidad FROM ContratoAccesorio
               WHERE IdContrato = @IdContrato AND DescontadoDeStock = 1) c
           ON c.IdAccesorioModelo = n.IdAccesorioModelo;

    -- Bloquea las filas de bodega mientras se revisa y se descuenta, para que dos contratos no tomen el mismo stock.
    DECLARE @Falta NVARCHAR(300) = (
        SELECT TOP 1 a.Nombre + N' de ' + m.Marca + N' ' + m.Modelo + N' (en bodega: ' + CAST(a.Cantidad AS NVARCHAR(10))
                     + N', se necesitan ' + CAST(d.Delta AS NVARCHAR(10)) + N' más)'
        FROM @Diferencia d
        INNER JOIN AccesorioModelo a WITH (UPDLOCK, HOLDLOCK) ON a.IdAccesorioModelo = d.IdAccesorioModelo
        INNER JOIN ModeloEquipo m ON m.IdModelo = a.IdModelo
        WHERE d.Delta > a.Cantidad
        ORDER BY a.Nombre);

    IF @Falta IS NOT NULL
    BEGIN
        DECLARE @Mensaje NVARCHAR(400) = N'No hay suficiente stock en bodega del accesorio ' + @Falta + N'.';
        THROW 50001, @Mensaje, 1;
    END

    UPDATE a SET a.Cantidad = a.Cantidad - d.Delta
    FROM AccesorioModelo a
    INNER JOIN @Diferencia d ON d.IdAccesorioModelo = a.IdAccesorioModelo
    WHERE d.Delta <> 0;

    DELETE FROM ContratoAccesorio WHERE IdContrato = @IdContrato;

    INSERT INTO ContratoAccesorio (IdContrato, IdAccesorioModelo, Cantidad, DescontadoDeStock)
    SELECT @IdContrato, IdAccesorioModelo, Cantidad, 1 FROM @Nuevo;
END
