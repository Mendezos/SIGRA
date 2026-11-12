-- Mantiene las series de contactos periódicos con ocurrencias para los próximos 12 meses (T-02, servicio de recordatorios).
-- Para cada serie "Activa" genera las ocurrencias idx = OcurrenciasGeneradas, +1, ... mientras
--   fn_CrmSerie_Fecha(FechaInicial, Periodicidad, idx) < DATEADD(MONTH, 12, hoy en Costa Rica)
-- que es la misma regla con la que se generan los primeros 12 meses al crear la serie. Nunca crea ocurrencias cuya fecha y hora ya
-- pasaron (si el servicio estuvo detenido, el índice avanza sin crear las pasadas) ni repite una ocurrencia que ya existe.
-- Se saltan las series cuya empresa dejó de estar activa o cuyo contacto quedó inactivo. El responsable puede estar inactivo.
-- Cada serie se procesa en su propia transacción: si una falla, las demás siguen (@Errores cuenta las que fallaron).
-- Es idempotente: ejecutarla otra vez no crea nada nuevo. @MostrarResultado = 0 la deja sin conjunto de resultados (la llama sp_CrmRecordatorio_Procesar).
CREATE PROCEDURE [dbo].[sp_CrmSerie_Extender]
    @SeriesExtendidas   INT = NULL OUTPUT,
    @OcurrenciasCreadas INT = NULL OUTPUT,
    @Errores            INT = NULL OUTPUT,
    @MostrarResultado   BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT OFF;

    SET @SeriesExtendidas = 0;
    SET @OcurrenciasCreadas = 0;
    SET @Errores = 0;

    DECLARE @Ahora DATETIME2(0) = dbo.fn_CrmAhora();
    DECLARE @Horizonte DATE = DATEADD(MONTH, 12, CONVERT(date, @Ahora));

    DECLARE @Series TABLE (
        Id INT IDENTITY (1, 1) PRIMARY KEY, IdSerie INT, IdProspecto INT, IdCliente INT, IdContactoEmpresa INT, Periodicidad VARCHAR(15),
        FechaInicial DATE, Hora TIME(0), Tipo VARCHAR(20), Motivo VARCHAR(500), Prioridad VARCHAR(10), IdResponsable INT,
        OcurrenciasGeneradas INT, IdUsuarioCrea INT
    );

    INSERT @Series (IdSerie, IdProspecto, IdCliente, IdContactoEmpresa, Periodicidad, FechaInicial, Hora, Tipo, Motivo, Prioridad,
                    IdResponsable, OcurrenciasGeneradas, IdUsuarioCrea)
    SELECT s.IdSerie, s.IdProspecto, s.IdCliente, s.IdContactoEmpresa, s.Periodicidad, s.FechaInicial, s.Hora, s.Tipo, s.Motivo, s.Prioridad,
           s.IdResponsable, s.OcurrenciasGeneradas, s.IdUsuarioCrea
    FROM SerieContactoCRM s
    LEFT JOIN Prospecto p ON p.IdProspecto = s.IdProspecto
    LEFT JOIN Cliente c ON c.IdCliente = s.IdCliente
    LEFT JOIN ContactoEmpresa ct ON ct.IdContactoEmpresa = s.IdContactoEmpresa
    WHERE s.Estado = 'Activa'
      AND ((s.IdProspecto IS NOT NULL AND p.Estado NOT IN ('Convertido', 'Descartado')) OR (s.IdCliente IS NOT NULL AND c.Activo = 1))
      AND (s.IdContactoEmpresa IS NULL OR ct.Activo = 1)
    ORDER BY s.IdSerie;

    DECLARE @I INT = 1, @N INT = (SELECT COUNT(*) FROM @Series);
    DECLARE @IdSerie INT, @IdProspecto INT, @IdCliente INT, @IdContacto INT, @Periodicidad VARCHAR(15), @FechaInicial DATE, @Hora TIME(0),
            @Tipo VARCHAR(20), @Motivo VARCHAR(500), @Prioridad VARCHAR(10), @IdResponsable INT, @Idx INT, @IdUsuarioCrea INT,
            @Fecha DATE, @FechaHora DATETIME2(0), @Creadas INT, @IdSeguimiento INT;

    WHILE @I <= @N
    BEGIN
        SELECT @IdSerie = IdSerie, @IdProspecto = IdProspecto, @IdCliente = IdCliente, @IdContacto = IdContactoEmpresa,
               @Periodicidad = Periodicidad, @FechaInicial = FechaInicial, @Hora = Hora, @Tipo = Tipo, @Motivo = Motivo,
               @Prioridad = Prioridad, @IdResponsable = IdResponsable, @Idx = OcurrenciasGeneradas, @IdUsuarioCrea = IdUsuarioCrea
        FROM @Series WHERE Id = @I;

        SET @Creadas = 0;
        DECLARE @IdxInicial INT = @Idx;

        BEGIN TRY
            BEGIN TRANSACTION;

            WHILE @Idx < @IdxInicial + 2000
            BEGIN
                SET @Fecha = dbo.fn_CrmSerie_Fecha(@FechaInicial, @Periodicidad, @Idx);
                IF @Fecha >= @Horizonte BREAK;

                SET @FechaHora = DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME(0)), @Hora), CAST(@Fecha AS DATETIME2(0)));

                IF @FechaHora >= @Ahora
                   AND NOT EXISTS (SELECT 1 FROM SeguimientoCRM WHERE IdSerie = @IdSerie AND FechaHoraOriginal = @FechaHora)
                BEGIN
                    INSERT SeguimientoCRM (IdProspecto, IdCliente, IdContactoEmpresa, Tipo, FechaHora, FechaHoraOriginal, Motivo, Prioridad,
                                           IdResponsable, Estado, Origen, IdSerie, IdUsuarioCrea)
                    VALUES (@IdProspecto, @IdCliente, @IdContacto, @Tipo, @FechaHora, @FechaHora, @Motivo, @Prioridad,
                            @IdResponsable, 'Pendiente', 'Serie', @IdSerie, @IdUsuarioCrea);
                    SET @IdSeguimiento = SCOPE_IDENTITY();

                    INSERT SeguimientoHistorial (IdSeguimiento, Accion, FechaHoraNueva, Motivo, IdUsuario)
                    VALUES (@IdSeguimiento, 'Creado', @FechaHora, N'Ocurrencia de contacto periódico generada automáticamente', @IdUsuarioCrea);

                    SET @Creadas += 1;
                END;

                SET @Idx += 1;
            END;

            UPDATE SerieContactoCRM SET OcurrenciasGeneradas = @Idx WHERE IdSerie = @IdSerie AND OcurrenciasGeneradas <> @Idx;

            COMMIT TRANSACTION;

            IF @Creadas > 0
            BEGIN
                SET @SeriesExtendidas += 1;
                SET @OcurrenciasCreadas += @Creadas;
            END;
        END TRY
        BEGIN CATCH
            IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
            SET @Errores += 1;
        END CATCH;

        SET @I += 1;
    END;

    IF @MostrarResultado = 1
        SELECT @SeriesExtendidas AS SeriesExtendidas, @OcurrenciasCreadas AS OcurrenciasCreadas, @Errores AS Errores;
END
