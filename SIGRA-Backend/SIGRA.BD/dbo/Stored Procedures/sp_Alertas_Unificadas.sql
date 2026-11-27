-- DAR-003, 018 y 019: todas las alertas activas del sistema en una sola lista, calculadas con el estado actual.
-- Cada alerta tiene una clave estable; las que ya se atendieron (AlertaAtencion) no se vuelven a mostrar. La clave incluye el dato
-- que la originó (por ejemplo, la cantidad en stock): si la situación cambia, es una alerta nueva y reaparece.
-- Urgencia: 3 alta, 2 media, 1 baja. IdModulo sirve para mostrar cada alerta solo a quien tiene permiso en ese módulo.
CREATE PROCEDURE [dbo].[sp_Alertas_Unificadas]
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Hoy DATE = dbo.fn_HoyCR();
    DECLARE @CargaDias INT = ISNULL((SELECT TOP 1 DiasHabilesEstimados FROM ConfiguracionTickets), 5);

    CREATE TABLE #A (Clave NVARCHAR(120), IdModulo INT, Categoria NVARCHAR(40), Urgencia INT, Titulo NVARCHAR(200), Detalle NVARCHAR(300),
                     IdResponsable INT NULL, Fecha DATE NULL, Entidad NVARCHAR(20), IdEntidad INT NULL);

    -- Stock mínimo (inventario)
    INSERT #A
    SELECT CONCAT('STOCK:', c.IdCategoria, ':', x.Disponibles), 4, 'Stock mínimo',
           CASE WHEN x.Disponibles < s.CantidadMinima THEN 3 ELSE 2 END,
           CONCAT(c.Nombre, ': ', x.Disponibles, ' disponibles (mínimo ', s.CantidadMinima, ')'),
           CASE WHEN x.Disponibles < s.CantidadMinima THEN N'Está por debajo del mínimo: conviene reabastecer.' ELSE N'Llegó al mínimo configurado.' END,
           NULL, @Hoy, 'categoria', c.IdCategoria
    FROM StockMinimoCategoria s
    INNER JOIN CategoriaEquipo c ON c.IdCategoria = s.IdCategoria
    CROSS APPLY (SELECT ISNULL(SUM(e.Cantidad), 0) AS Disponibles FROM ModeloEquipo m INNER JOIN Equipo e ON e.IdModelo = m.IdModelo
                 WHERE m.IdCategoria = c.IdCategoria AND e.Estado = 'Disponible' AND ISNULL(e.Propietario, '') <> 'Cliente') x
    WHERE s.CantidadMinima > 0 AND x.Disponibles <= s.CantidadMinima;

    -- Baterías de radios alquilados a un mes o menos de cumplir 12 meses (alquiler)
    INSERT #A
    SELECT CONCAT('BATERIA:', e.IdEquipo, ':', CONVERT(CHAR(8), b.FechaCambio, 112)), 3, 'Batería',
           CASE WHEN DATEADD(MONTH, 12, b.FechaCambio) <= @Hoy THEN 3 ELSE 2 END,
           CONCAT(N'Batería del radio ', e.NumeroSerie, ' (', cl.Empresa, ')'),
           CONCAT(CASE WHEN DATEADD(MONTH, 12, b.FechaCambio) <= @Hoy THEN N'Venció el ' ELSE N'Vence el ' END, CONVERT(CHAR(10), DATEADD(MONTH, 12, b.FechaCambio), 103), '.'),
           ct.IdVendedor, DATEADD(MONTH, 12, b.FechaCambio), 'equipo', e.IdEquipo
    FROM ContratoEquipo ce
    INNER JOIN Equipo e ON e.IdEquipo = ce.IdEquipo
    INNER JOIN Contrato ct ON ct.IdContrato = ce.IdContrato
    INNER JOIN Cliente cl ON cl.IdCliente = ct.IdCliente
    CROSS APPLY (SELECT TOP 1 cb.FechaCambio FROM CambioBateria cb WHERE cb.IdRadio = e.IdEquipo ORDER BY cb.FechaCambio DESC, cb.IdCambioBateria DESC) b
    WHERE ce.FechaDevolucion IS NULL AND DATEADD(MONTH, 11, b.FechaCambio) <= @Hoy;

    -- Contratos activos que vencen en 60 días o menos, o ya vencidos (contratos)
    INSERT #A
    SELECT CONCAT('CONTRATO:', c.IdContrato, ':', CONVERT(CHAR(8), c.FechaVencimiento, 112)), 7, 'Contrato',
           CASE WHEN c.FechaVencimiento <= DATEADD(DAY, 15, @Hoy) THEN 3 WHEN c.FechaVencimiento <= DATEADD(DAY, 30, @Hoy) THEN 2 ELSE 1 END,
           CONCAT('Contrato CT-', RIGHT(CONCAT('000', c.IdContrato), 4), ' de ', cl.Empresa),
           CASE WHEN c.FechaVencimiento < @Hoy THEN CONCAT(N'Venció el ', CONVERT(CHAR(10), c.FechaVencimiento, 103), ' y sigue sin renovarse.')
                ELSE CONCAT(N'Vence el ', CONVERT(CHAR(10), c.FechaVencimiento, 103), ' (faltan ', DATEDIFF(DAY, @Hoy, c.FechaVencimiento), N' días).') END,
           c.IdVendedor, c.FechaVencimiento, 'contrato', c.IdContrato
    FROM Contrato c INNER JOIN Cliente cl ON cl.IdCliente = c.IdCliente
    WHERE c.Estado = 'Activo' AND c.FechaVencimiento <= DATEADD(DAY, 60, @Hoy);

    -- Frecuencias con aviso de vencimiento sin atender (frecuencias)
    INSERT #A
    SELECT CONCAT('FRECUENCIA:', a.IdAlerta), 11, 'Frecuencia',
           CASE WHEN a.Tipo = 'Final' OR a.FechaVencimiento <= DATEADD(DAY, 30, @Hoy) THEN 3 ELSE 2 END,
           CONCAT(N'Frecuencia ', s.Frecuencia, ' de ', cl.Empresa),
           CONCAT(N'Vence el ', CONVERT(CHAR(10), a.FechaVencimiento, 103), '.'),
           a.IdVendedor, a.FechaVencimiento, 'frecuencia', a.IdSolicitud
    FROM AlertaFrecuencia a
    INNER JOIN SolicitudFrecuencia s ON s.IdSolicitud = a.IdSolicitud
    INNER JOIN Cliente cl ON cl.IdCliente = s.IdCliente
    WHERE a.Atendida = 0;

    -- Boletas abiertas atrasadas o sin técnico hace más de 2 días (tickets)
    INSERT #A
    SELECT CONCAT('BOLETA:', v.IdTicket, CASE WHEN v.IdTecnicoAsignado IS NULL THEN ':sin' ELSE ':atrasada' END), 2,
           CASE WHEN v.IdTecnicoAsignado IS NULL THEN 'Sin técnico' ELSE 'Boleta atrasada' END,
           CASE WHEN d.Dias >= 10 THEN 3 ELSE 2 END,
           CONCAT('Boleta #', v.NumeroBoleta, ' de ', v.Empresa),
           CASE WHEN v.IdTecnicoAsignado IS NULL THEN CONCAT(N'Lleva ', d.Dias, N' días esperando que un técnico la tome.')
                ELSE CONCAT(N'Lleva ', d.Dias, N' días abierta (', v.TipoServicio, ').') END,
           v.IdTecnicoAsignado, d.Desde, 'boleta', v.IdTicket
    FROM vw_TicketDetalle v
    CROSS APPLY (SELECT CAST(SWITCHOFFSET(COALESCE(v.FechaAsignacion, v.FechaRecepcion), '-06:00') AS DATE) AS Desde,
                        DATEDIFF(DAY, CAST(SWITCHOFFSET(COALESCE(v.FechaAsignacion, v.FechaRecepcion), '-06:00') AS DATE), @Hoy) AS Dias) d
    WHERE v.Activo = 1 AND v.Estado IN ('Creada', 'Asignada', 'En proceso')
      AND ((v.IdTecnicoAsignado IS NULL AND d.Dias > 2) OR (v.IdTecnicoAsignado IS NOT NULL AND d.Dias > @CargaDias));

    -- Seguimientos comerciales atrasados (CRM)
    INSERT #A
    SELECT CONCAT('SEGUIMIENTO:', s.IdSeguimiento, ':', CONVERT(CHAR(8), s.FechaHora, 112)), 9, 'Seguimiento',
           CASE WHEN s.Prioridad = 'Alta' THEN 3 ELSE 2 END,
           CONCAT(s.Tipo, N' pendiente con ', COALESCE(p.Empresa, c.Empresa)),
           CONCAT(N'Estaba programado para el ', CONVERT(CHAR(10), s.FechaHora, 103), '.'),
           s.IdResponsable, CAST(s.FechaHora AS DATE), 'seguimiento', s.IdSeguimiento
    FROM SeguimientoCRM s
    LEFT JOIN Prospecto p ON p.IdProspecto = s.IdProspecto
    LEFT JOIN Cliente c ON c.IdCliente = s.IdCliente
    WHERE s.Estado = 'Atrasado' OR (s.Estado = 'Pendiente' AND s.FechaHora < dbo.fn_CrmAhora());

    -- Facturas con cobro irregular o vencido (facturación)
    INSERT #A
    SELECT CONCAT('FACTURA:', f.IdFactura, ':', f.EstadoCobro), 7, 'Cobro',
           CASE WHEN f.EstadoCobro IN ('Irregular', 'Vencida') THEN 3 ELSE 2 END,
           CONCAT('Factura ', f.NumeroFactura, ' de ', c.Empresa),
           CASE WHEN f.EstadoCobro = 'Irregular' THEN N'El cobro está marcado como irregular.'
                ELSE CONCAT(N'El pago venció el ', CONVERT(CHAR(10), f.FechaVencimientoPago, 103), '.') END,
           f.IdVendedor, f.FechaVencimientoPago, 'factura', f.IdFactura
    FROM Factura f INNER JOIN Cliente c ON c.IdCliente = f.IdCliente
    WHERE f.EstadoCobro IN ('Irregular', 'Vencida')
       OR (f.EstadoCobro IN ('Pendiente', 'Parcial') AND f.FechaVencimientoPago < @Hoy);

    SELECT a.Clave, a.IdModulo, a.Categoria, a.Urgencia, a.Titulo, a.Detalle, a.IdResponsable, u.Nombre AS Responsable, a.Fecha, a.Entidad, a.IdEntidad
    FROM #A a
    LEFT JOIN Usuario u ON u.IdUsuario = a.IdResponsable
    WHERE NOT EXISTS (SELECT 1 FROM AlertaAtencion x WHERE x.Clave = a.Clave)
    ORDER BY a.Urgencia DESC, a.Fecha, a.Titulo;

    -- Últimas alertas atendidas
    SELECT TOP 15 x.Clave, x.IdModulo, x.Titulo, x.Nota, u.Nombre AS Usuario, DATEADD(HOUR, -6, x.Fecha) AS Fecha
    FROM AlertaAtencion x INNER JOIN Usuario u ON u.IdUsuario = x.IdUsuario
    ORDER BY x.Fecha DESC;
END
