-- CRMGPSC-021: todo lo que se sabe de un cliente. Devuelve 13 conjuntos de resultados, en este orden:
-- 1 empresa, 2 contactos, 3 responsables (historial), 4 ventas, 5 equipos en alquiler, 6 contratos, 7 frecuencias, 8 tickets,
-- 9 facturas, 10 cotizaciones, 11 notas (las "Privada" solo las ve su autor), 12 interacciones, 13 seguimientos.
-- Qué secciones se muestran según el rol lo decide el flujo; aquí se devuelve todo.
CREATE PROCEDURE [dbo].[sp_CrmCliente_Perfil]
    @IdCliente INT,
    @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Hoy DATE = CONVERT(date, DATEADD(HOUR, -6, SYSUTCDATETIME()));

    SELECT c.IdCliente, c.Empresa, c.Contacto, c.Correo, c.Telefono, c.Sector, c.Direccion, c.TamanoFlota, c.Activo, c.MotivoInactivacion,
           c.IdVendedor, v.Nombre AS Vendedor, CAST(ISNULL(v.Activo, 0) AS BIT) AS VendedorActivo, TODATETIMEOFFSET(c.FechaRegistro, '+00:00') AS FechaRegistro,
           (SELECT TOP (1) p.IdProspecto FROM Prospecto p WHERE p.IdCliente = c.IdCliente ORDER BY p.FechaConversion DESC) AS IdProspectoOrigen
    FROM Cliente c LEFT JOIN Usuario v ON v.IdUsuario = c.IdVendedor
    WHERE c.IdCliente = @IdCliente;

    SELECT ce.IdContactoEmpresa, ce.Nombre, ce.Cargo, ce.Telefono, ce.Correo, ce.FechaCumpleanos, ce.PreferenciaContacto, ce.EsPrincipal, ce.Activo, ce.MotivoDesactivacion
    FROM ContactoEmpresa ce WHERE ce.IdCliente = @IdCliente
    ORDER BY ce.Activo DESC, ce.EsPrincipal DESC, ce.Nombre;

    SELECT h.IdCambio, va.Nombre AS VendedorAnterior, vn.Nombre AS VendedorNuevo, h.Motivo, h.SeguimientosMovidos, u.Nombre AS Usuario, TODATETIMEOFFSET(h.Fecha, '+00:00') AS Fecha
    FROM ResponsableComercialHistorial h
    LEFT JOIN Usuario va ON va.IdUsuario = h.IdVendedorAnterior
    LEFT JOIN Usuario vn ON vn.IdUsuario = h.IdVendedorNuevo
    LEFT JOIN Usuario u ON u.IdUsuario = h.IdUsuario
    WHERE h.IdCliente = @IdCliente
    ORDER BY h.Fecha DESC, h.IdCambio DESC;

    SELECT x.Origen, x.Fecha, x.Descripcion, x.Monto, x.Moneda FROM (
        SELECT N'Venta inicial' AS Origen, vi.Fecha, CAST(vi.Cantidad AS NVARCHAR(10)) + N' × ' + vi.Producto AS Descripcion, vi.Monto, vi.Moneda
        FROM ClienteVentaInicial vi WHERE vi.IdCliente = @IdCliente
        UNION ALL
        SELECT N'Factura de venta', f.Fecha, f.NumeroFactura + ISNULL(N' · ' + (SELECT TOP (1) l.Descripcion FROM FacturaLinea l WHERE l.IdFactura = f.IdFactura ORDER BY l.IdLinea), N''), f.Total, f.Moneda
        FROM Factura f WHERE f.IdCliente = @IdCliente AND f.Tipo = 'Venta' AND f.Estado <> 'Anulada'
    ) x ORDER BY x.Fecha DESC;

    SELECT e.IdEquipo, e.NumeroSerie, m.Marca, m.Modelo, cat.Nombre AS Categoria, e.Estado, ct.IdContrato, ce.FechaAsignacion
    FROM ContratoEquipo ce
    INNER JOIN Contrato ct ON ct.IdContrato = ce.IdContrato
    INNER JOIN Equipo e ON e.IdEquipo = ce.IdEquipo
    INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    INNER JOIN CategoriaEquipo cat ON cat.IdCategoria = m.IdCategoria
    WHERE ct.IdCliente = @IdCliente AND ce.FechaDevolucion IS NULL
    ORDER BY cat.Nombre, e.NumeroSerie;

    SELECT ct.IdContrato,
           CASE WHEN ct.Estado IN ('Activo', 'Renovado') AND ct.FechaVencimiento < @Hoy
                     AND NOT (ct.Estado = 'Renovado' AND EXISTS (SELECT 1 FROM Contrato s WHERE s.IdContratoOrigen = ct.IdContrato)) THEN 'Vencido' ELSE ct.Estado END AS Estado,
           ct.FechaInicio, ct.FechaVencimiento, ct.MontoMensual, ct.Moneda,
           (SELECT COUNT(*) FROM ContratoEquipo x WHERE x.IdContrato = ct.IdContrato AND x.FechaDevolucion IS NULL)
           + (SELECT COUNT(*) FROM ContratoEquipoBorrador b WHERE b.IdContrato = ct.IdContrato) AS CantidadEquipos
    FROM Contrato ct WHERE ct.IdCliente = @IdCliente
    ORDER BY ct.IdContrato DESC;

    SELECT s.IdSolicitud, s.Estado, s.Frecuencia, s.Banda, s.FechaVencimiento, e.NumeroSerie
    FROM SolicitudFrecuencia s INNER JOIN Equipo e ON e.IdEquipo = s.IdEquipo
    WHERE s.IdCliente = @IdCliente
    ORDER BY s.IdSolicitud DESC;

    SELECT t.IdTicket, g.NumeroBoleta, t.TipoServicio, t.Estado, TODATETIMEOFFSET(t.FechaRecepcion, '+00:00') AS FechaRecepcion
    FROM Ticket t INNER JOIN TicketGestion g ON g.IdTicket = t.IdTicket
    WHERE t.IdCliente = @IdCliente AND t.Activo = 1
    ORDER BY t.IdTicket DESC;

    SELECT f.IdFactura, f.NumeroFactura, f.Tipo, f.Fecha, f.Total, f.Moneda, f.Estado, f.EstadoCobro
    FROM Factura f WHERE f.IdCliente = @IdCliente
    ORDER BY f.Fecha DESC, f.IdFactura DESC;

    SELECT q.IdCotizacion, q.Fecha, q.Monto, q.Moneda, q.Estado, q.Version
    FROM Cotizacion q WHERE q.IdCliente = @IdCliente
    ORDER BY q.Fecha DESC, q.IdCotizacion DESC;

    SELECT TOP (100) n.IdNota, n.Categoria, n.Texto, n.Visibilidad, u.Nombre AS Autor, TODATETIMEOFFSET(n.Fecha, '+00:00') AS Fecha
    FROM NotaCRM n LEFT JOIN Usuario u ON u.IdUsuario = n.IdUsuario
    WHERE n.IdCliente = @IdCliente AND (n.Visibilidad <> 'Privada' OR n.IdUsuario = @IdUsuario)
    ORDER BY n.Fecha DESC, n.IdNota DESC;

    SELECT TOP (100) i.IdInteraccion, i.Fecha, i.Tipo, i.Detalle, i.Resultado, i.ProximoPaso, u.Nombre AS Usuario, ce.Nombre AS Contacto
    FROM InteraccionCRM i
    LEFT JOIN Usuario u ON u.IdUsuario = i.IdUsuario
    LEFT JOIN ContactoEmpresa ce ON ce.IdContactoEmpresa = i.IdContactoEmpresa
    WHERE i.IdCliente = @IdCliente
    ORDER BY i.Fecha DESC, i.IdInteraccion DESC;

    SELECT TOP (100) s.IdSeguimiento, s.Tipo, s.FechaHora, s.Motivo, s.Prioridad, u.Nombre AS Responsable,
           CASE WHEN s.Estado = 'Pendiente' AND s.FechaHora < dbo.fn_CrmAhora() THEN 'Atrasado' ELSE s.Estado END AS Estado,
           s.Origen, s.Resultado, s.MotivoCancelacion
    FROM SeguimientoCRM s LEFT JOIN Usuario u ON u.IdUsuario = s.IdResponsable
    WHERE s.IdCliente = @IdCliente
    ORDER BY CASE WHEN s.Estado IN ('Pendiente', 'Atrasado') THEN 0 ELSE 1 END,
             CASE WHEN s.Estado IN ('Pendiente', 'Atrasado') THEN s.FechaHora END ASC, s.FechaHora DESC, s.IdSeguimiento DESC;
END
