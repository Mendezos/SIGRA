-- DAR-001 a 004 y 008: panel de indicadores del inventario.
-- Cuenta los equipos con número de serie que son de Radifax (los accesorios y repuestos van por cantidad y los equipos
-- del cliente no forman parte del inventario alquilable). Filtros opcionales por categoría, modelo y rango de fechas (el rango
-- solo afecta la evolución). Devuelve: 1) indicadores, 2) equipos por categoría, 3) evolución mensual alquilado/disponible,
-- 4) stock contra mínimo, 5) baterías por cambiar y 6) categorías y modelos para los filtros.
CREATE PROCEDURE [dbo].[sp_Dashboard_Inventario]
    @IdCategoria INT  = NULL,
    @IdModelo    INT  = NULL,
    @Desde       DATE = NULL,
    @Hasta       DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Hoy DATE = dbo.fn_HoyCR();
    IF @Hasta IS NULL OR @Hasta > @Hoy SET @Hasta = @Hoy;
    IF @Desde IS NULL SET @Desde = DATEADD(MONTH, -11, DATEFROMPARTS(YEAR(@Hasta), MONTH(@Hasta), 1));
    IF @Desde > @Hasta
        THROW 50001, 'La fecha inicial no puede ser posterior a la final.', 1;

    SELECT e.IdEquipo, e.Estado, e.FechaAdquisicion, e.FechaBaja, m.IdCategoria
    INTO #Equipos
    FROM Equipo e
    INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    INNER JOIN CategoriaEquipo c ON c.IdCategoria = m.IdCategoria
    WHERE c.ManejaCantidad = 0 AND ISNULL(e.Propietario, '') <> 'Cliente'
      AND (@IdCategoria IS NULL OR m.IdCategoria = @IdCategoria)
      AND (@IdModelo IS NULL OR m.IdModelo = @IdModelo);

    -- Fechas de corte: fin de cada mes del rango (el último es la fecha final). Máximo 36 meses.
    ;WITH Meses AS (
        SELECT DATEFROMPARTS(YEAR(@Desde), MONTH(@Desde), 1) AS Mes, 1 AS n
        UNION ALL
        SELECT DATEADD(MONTH, 1, Mes), n + 1 FROM Meses WHERE DATEADD(MONTH, 1, Mes) <= @Hasta AND n < 36
    )
    SELECT Mes, CASE WHEN EOMONTH(Mes) > @Hasta THEN @Hasta ELSE EOMONTH(Mes) END AS Corte
    INTO #Cortes
    FROM Meses;

    -- Estado de cada equipo en cada fecha de corte (y hoy / hace 30 días, para la comparación).
    -- Hoy manda el estado actual del equipo (así el último punto coincide con los indicadores). Para el pasado se usa el último
    -- movimiento registrado hasta esa fecha y, si no hay, si el equipo estaba asignado a un contrato en ese momento.
    SELECT f.Corte,
           COUNT(CASE WHEN a.EstadoEn = 'Alquilado' THEN 1 END) AS Alquilados,
           COUNT(CASE WHEN a.EstadoEn = 'Disponible' THEN 1 END) AS Disponibles
    INTO #Historia
    FROM (SELECT Corte FROM #Cortes UNION SELECT @Hoy UNION SELECT DATEADD(DAY, -30, @Hoy)) f
    LEFT JOIN #Equipos e
        ON (e.FechaAdquisicion IS NULL OR e.FechaAdquisicion <= f.Corte) AND (e.FechaBaja IS NULL OR e.FechaBaja > f.Corte)
    OUTER APPLY (
        SELECT CASE
                 WHEN e.IdEquipo IS NULL THEN NULL
                 WHEN f.Corte = @Hoy THEN e.Estado
                 ELSE COALESCE(
                     (SELECT TOP 1 mv.EstadoNuevo FROM MovimientoInventario mv
                       WHERE mv.IdEquipo = e.IdEquipo AND mv.Fecha < DATEADD(DAY, 1, CAST(f.Corte AS DATETIME))
                       ORDER BY mv.Fecha DESC, mv.IdMovimiento DESC),
                     CASE WHEN EXISTS (SELECT 1 FROM ContratoEquipo ce WHERE ce.IdEquipo = e.IdEquipo AND ce.FechaAsignacion <= f.Corte
                                         AND (ce.FechaDevolucion IS NULL OR ce.FechaDevolucion > f.Corte)) THEN 'Alquilado' ELSE 'Disponible' END)
               END AS EstadoEn
    ) a
    GROUP BY f.Corte;

    -- 1) Indicadores
    SELECT COUNT(CASE WHEN Estado <> 'Dado de baja' THEN 1 END) AS Total,
           COUNT(CASE WHEN Estado = 'Disponible' THEN 1 END) AS Disponibles,
           COUNT(CASE WHEN Estado = 'Alquilado' THEN 1 END) AS Alquilados,
           COUNT(CASE WHEN Estado IN ('En mantenimiento', 'En reparación', 'En garantía') THEN 1 END) AS EnTaller,
           COUNT(CASE WHEN Estado = 'En mantenimiento' THEN 1 END) AS EnMantenimiento,
           COUNT(CASE WHEN Estado = 'En reparación' THEN 1 END) AS EnReparacion,
           COUNT(CASE WHEN Estado = 'En garantía' THEN 1 END) AS EnGarantia,
           COUNT(CASE WHEN Estado = 'Dado de baja' THEN 1 END) AS DadosDeBaja,
           (SELECT Alquilados FROM #Historia WHERE Corte = @Hoy) -
               (SELECT Alquilados FROM #Historia WHERE Corte = DATEADD(DAY, -30, @Hoy)) AS CambioAlquilados30,
           (SELECT Disponibles FROM #Historia WHERE Corte = @Hoy) -
               (SELECT Disponibles FROM #Historia WHERE Corte = DATEADD(DAY, -30, @Hoy)) AS CambioDisponibles30
    FROM #Equipos;

    -- 2) Equipos por categoría (sin los dados de baja)
    SELECT c.IdCategoria, c.Nombre AS Categoria,
           COUNT(CASE WHEN e.Estado = 'Alquilado' THEN 1 END) AS Alquilados,
           COUNT(CASE WHEN e.Estado = 'Disponible' THEN 1 END) AS Disponibles,
           COUNT(CASE WHEN e.Estado IN ('En mantenimiento', 'En reparación', 'En garantía') THEN 1 END) AS EnTaller
    FROM #Equipos e
    INNER JOIN CategoriaEquipo c ON c.IdCategoria = e.IdCategoria
    WHERE e.Estado <> 'Dado de baja'
    GROUP BY c.IdCategoria, c.Nombre
    ORDER BY COUNT(*) DESC, c.Nombre;

    -- 3) Evolución mensual
    SELECT c.Mes, h.Alquilados, h.Disponibles
    FROM #Cortes c INNER JOIN #Historia h ON h.Corte = c.Corte
    ORDER BY c.Mes;

    -- 4) Stock disponible contra el mínimo configurado (incluye lo que se maneja por cantidad)
    SELECT c.IdCategoria, c.Nombre AS Categoria, s.CantidadMinima AS Minimo,
           ISNULL(SUM(CASE WHEN e.Estado = 'Disponible' AND ISNULL(e.Propietario, '') <> 'Cliente' THEN e.Cantidad END), 0) AS Disponibles
    FROM StockMinimoCategoria s
    INNER JOIN CategoriaEquipo c ON c.IdCategoria = s.IdCategoria
    LEFT JOIN ModeloEquipo m ON m.IdCategoria = c.IdCategoria AND (@IdModelo IS NULL OR m.IdModelo = @IdModelo)
    LEFT JOIN Equipo e ON e.IdModelo = m.IdModelo
    WHERE s.CantidadMinima > 0 AND (@IdCategoria IS NULL OR c.IdCategoria = @IdCategoria)
    GROUP BY c.IdCategoria, c.Nombre, s.CantidadMinima
    ORDER BY c.Nombre;

    -- 5) Radios alquilados con la batería vencida o a un mes de vencer (ciclo de 12 meses)
    SELECT e.NumeroSerie, m.Marca + ' ' + m.Modelo AS Modelo, cl.Empresa, b.FechaCambio,
           DATEADD(MONTH, 12, b.FechaCambio) AS FechaVencimiento,
           CASE WHEN DATEADD(MONTH, 12, b.FechaCambio) <= @Hoy THEN 'Vencida' ELSE N'Próxima' END AS Estado
    FROM #Equipos q
    INNER JOIN Equipo e ON e.IdEquipo = q.IdEquipo
    INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    INNER JOIN ContratoEquipo ce ON ce.IdEquipo = e.IdEquipo AND ce.FechaDevolucion IS NULL
    INNER JOIN Contrato ct ON ct.IdContrato = ce.IdContrato
    INNER JOIN Cliente cl ON cl.IdCliente = ct.IdCliente
    CROSS APPLY (SELECT TOP 1 cb.FechaCambio FROM CambioBateria cb WHERE cb.IdRadio = e.IdEquipo
                 ORDER BY cb.FechaCambio DESC, cb.IdCambioBateria DESC) b
    WHERE DATEADD(MONTH, 11, b.FechaCambio) <= @Hoy
    ORDER BY b.FechaCambio;

    -- 6) Categorías y modelos para los filtros
    SELECT DISTINCT c.IdCategoria, c.Nombre AS Categoria, m.IdModelo, m.Marca + ' ' + m.Modelo AS Modelo
    FROM ModeloEquipo m INNER JOIN CategoriaEquipo c ON c.IdCategoria = m.IdCategoria
    WHERE c.ManejaCantidad = 0
    ORDER BY Categoria, Modelo;
END
