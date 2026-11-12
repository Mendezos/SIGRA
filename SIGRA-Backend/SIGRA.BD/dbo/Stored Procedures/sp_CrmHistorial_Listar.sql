-- CRMGPSC-014: historial comercial de una empresa del CRM (prospecto o cliente).
-- Une, en una sola línea de tiempo ordenada de la más reciente a la más antigua (hora de Costa Rica):
--   * interacciones (InteraccionCRM.Fecha ya es hora de Costa Rica),
--   * notas (NotaCRM.Fecha es UTC: se convierte a hora de Costa Rica; respetan la visibilidad),
--   * cotizaciones (solo tienen fecha: 00:00 de ese día, o la hora de creación si se creó ese mismo día).
-- Visibilidad de las notas: Privada solo la ve su autor (@IdUsuario); Equipo y General las ven todos los que consultan el CRM.
-- Filtros opcionales: @TipoMovimiento (Interacción | Nota | Cotización | un tipo de interacción), rango de fechas
-- (@FechaDesde/@FechaHasta, ambas inclusive, por el día en hora de Costa Rica) y @IdAutor.
-- Devuelve 3 conjuntos de resultados: (1) movimientos filtrados, (2) autores que aparecen en el historial visible (sin filtrar,
-- para llenar el filtro de autor) y (3) el total de movimientos visibles sin filtros (distingue "sin actividad" de "sin coincidencias").
CREATE PROCEDURE [dbo].[sp_CrmHistorial_Listar]
    @TipoEmpresa    VARCHAR(10),
    @IdEmpresa      INT,
    @IdUsuario      INT,
    @TipoMovimiento VARCHAR(30) = NULL,
    @FechaDesde     DATE        = NULL,
    @FechaHasta     DATE        = NULL,
    @IdAutor        INT         = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @TipoEmpresa NOT IN ('Prospecto', 'Cliente')
        THROW 50001, N'El tipo de empresa debe ser Prospecto o Cliente.', 1;

    IF (@TipoEmpresa = 'Prospecto' AND NOT EXISTS (SELECT 1 FROM Prospecto WHERE IdProspecto = @IdEmpresa))
       OR (@TipoEmpresa = 'Cliente' AND NOT EXISTS (SELECT 1 FROM Cliente WHERE IdCliente = @IdEmpresa))
        THROW 50001, N'La empresa indicada no existe.', 1;

    IF @FechaDesde IS NOT NULL AND @FechaHasta IS NOT NULL AND @FechaDesde > @FechaHasta
        THROW 50001, N'La fecha inicial no puede ser posterior a la final', 1;

    DECLARE @Mov TABLE (
        TipoMovimiento    VARCHAR(20)   NOT NULL,
        IdMovimiento      INT           NOT NULL,
        Tipo              VARCHAR(50)   NOT NULL,
        Fecha             DATETIME2(0)  NOT NULL,
        IdContactoEmpresa INT           NULL,
        Contacto          VARCHAR(150)  NULL,
        Categoria         VARCHAR(30)   NULL,
        Visibilidad       VARCHAR(20)   NULL,
        Descripcion       VARCHAR(MAX)  NULL,
        Resultado         VARCHAR(500)  NULL,
        ProximoPaso       VARCHAR(500)  NULL,
        IdCotizacion      INT           NULL,
        EstadoCotizacion  VARCHAR(30)   NULL,
        Monto             DECIMAL(12,2) NULL,
        Moneda            CHAR(3)       NULL,
        IdAutor           INT           NULL,
        Autor             VARCHAR(150)  NULL
    );

    -- Interacciones
    INSERT INTO @Mov
    SELECT N'Interacción', i.IdInteraccion, i.Tipo, CONVERT(DATETIME2(0), i.Fecha),
           i.IdContactoEmpresa, ce.Nombre, NULL, NULL, i.Detalle, i.Resultado, i.ProximoPaso,
           i.IdCotizacion, NULL, NULL, NULL, i.IdUsuario, u.Nombre
    FROM InteraccionCRM i
    JOIN Usuario u ON u.IdUsuario = i.IdUsuario
    LEFT JOIN ContactoEmpresa ce ON ce.IdContactoEmpresa = i.IdContactoEmpresa
    WHERE (@TipoEmpresa = 'Prospecto' AND i.IdProspecto = @IdEmpresa)
       OR (@TipoEmpresa = 'Cliente' AND i.IdCliente = @IdEmpresa);

    -- Notas (Privada: solo su autor)
    INSERT INTO @Mov
    SELECT N'Nota', n.IdNota, N'Nota',
           CONVERT(DATETIME2(0), SWITCHOFFSET(TODATETIMEOFFSET(n.Fecha, '+00:00'), '-06:00')),
           NULL, NULL, n.Categoria, n.Visibilidad, n.Texto, NULL, NULL,
           NULL, NULL, NULL, NULL, n.IdUsuario, u.Nombre
    FROM NotaCRM n
    JOIN Usuario u ON u.IdUsuario = n.IdUsuario
    WHERE ((@TipoEmpresa = 'Prospecto' AND n.IdProspecto = @IdEmpresa) OR (@TipoEmpresa = 'Cliente' AND n.IdCliente = @IdEmpresa))
      AND (n.Visibilidad IN ('Equipo', 'General') OR n.IdUsuario = @IdUsuario);

    -- Cotizaciones de la empresa
    INSERT INTO @Mov
    SELECT N'Cotización', c.IdCotizacion, N'Cotización',
           CASE WHEN CONVERT(DATE, SWITCHOFFSET(TODATETIMEOFFSET(c.FechaCreacion, '+00:00'), '-06:00')) = c.Fecha
                THEN CONVERT(DATETIME2(0), SWITCHOFFSET(TODATETIMEOFFSET(c.FechaCreacion, '+00:00'), '-06:00'))
                ELSE CONVERT(DATETIME2(0), c.Fecha) END,
           NULL, NULL, NULL, NULL, NULL, NULL, NULL,
           c.IdCotizacion, c.Estado, c.Monto, c.Moneda, COALESCE(c.IdUsuarioCrea, c.IdVendedor), u.Nombre
    FROM Cotizacion c
    LEFT JOIN Usuario u ON u.IdUsuario = COALESCE(c.IdUsuarioCrea, c.IdVendedor)
    WHERE (@TipoEmpresa = 'Prospecto' AND c.IdProspecto = @IdEmpresa)
       OR (@TipoEmpresa = 'Cliente' AND c.IdCliente = @IdEmpresa);

    -- 1) Movimientos que cumplen los filtros, del más reciente al más antiguo
    SELECT m.TipoMovimiento, m.IdMovimiento, m.Tipo, m.Fecha, m.IdContactoEmpresa, m.Contacto, m.Categoria, m.Visibilidad,
           m.Descripcion, m.Resultado, m.ProximoPaso, m.IdCotizacion, m.EstadoCotizacion, m.Monto, m.Moneda, m.IdAutor, m.Autor
    FROM @Mov m
    WHERE (@TipoMovimiento IS NULL OR m.TipoMovimiento = @TipoMovimiento OR m.Tipo = @TipoMovimiento)
      AND (@FechaDesde IS NULL OR CONVERT(DATE, m.Fecha) >= @FechaDesde)
      AND (@FechaHasta IS NULL OR CONVERT(DATE, m.Fecha) <= @FechaHasta)
      AND (@IdAutor IS NULL OR m.IdAutor = @IdAutor)
    ORDER BY m.Fecha DESC, m.IdMovimiento DESC, m.TipoMovimiento;

    -- 2) Autores presentes en el historial visible
    SELECT DISTINCT m.IdAutor AS IdUsuario, m.Autor AS Nombre
    FROM @Mov m
    WHERE m.IdAutor IS NOT NULL
    ORDER BY Nombre;

    -- 3) Total de movimientos visibles sin filtros
    SELECT COUNT(*) AS Total FROM @Mov;
END
