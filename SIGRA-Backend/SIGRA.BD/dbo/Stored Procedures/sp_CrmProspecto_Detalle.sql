-- CRMGPSC-002 (detalle): todo lo que se sabe de un prospecto, solo lectura. Devuelve 7 conjuntos de resultados, en este orden:
-- 1 datos de la empresa, 2 contactos, 3 cotizaciones, 4 notas (las "Privada" solo las ve su autor), 5 interacciones, 6 seguimientos,
-- 7 cambios de estado. Las interacciones y los seguimientos están en hora de pared de Costa Rica; las marcas del sistema, en UTC.
-- Un seguimiento "Pendiente" cuya hora ya pasó se muestra como "Atrasado" aunque la agenda todavía no lo haya marcado.
CREATE PROCEDURE [dbo].[sp_CrmProspecto_Detalle]
    @IdProspecto INT,
    @IdUsuario   INT
AS
BEGIN
    SET NOCOUNT ON;

    EXEC sp_CrmProspecto_Obtener @IdProspecto = @IdProspecto;

    SELECT ce.IdContactoEmpresa, ce.Nombre, ce.Cargo, ce.Telefono, ce.Correo, ce.FechaCumpleanos, ce.PreferenciaContacto,
           ce.EsPrincipal, ce.Activo, ce.MotivoDesactivacion
    FROM ContactoEmpresa ce
    WHERE ce.IdProspecto = @IdProspecto
    ORDER BY ce.Activo DESC, ce.EsPrincipal DESC, ce.Nombre;

    SELECT q.IdCotizacion, q.Fecha, q.Monto, q.Moneda, q.Estado, q.Version
    FROM Cotizacion q
    WHERE q.IdProspecto = @IdProspecto
    ORDER BY q.Fecha DESC, q.IdCotizacion DESC;

    SELECT TOP (100) n.IdNota, n.Categoria, n.Texto, n.Visibilidad, u.Nombre AS Autor, TODATETIMEOFFSET(n.Fecha, '+00:00') AS Fecha
    FROM NotaCRM n
    LEFT JOIN Usuario u ON u.IdUsuario = n.IdUsuario
    WHERE n.IdProspecto = @IdProspecto AND (n.Visibilidad <> 'Privada' OR n.IdUsuario = @IdUsuario)
    ORDER BY n.Fecha DESC, n.IdNota DESC;

    SELECT TOP (100) i.IdInteraccion, i.Fecha, i.Tipo, i.Detalle, i.Resultado, i.ProximoPaso, u.Nombre AS Usuario, ce.Nombre AS Contacto
    FROM InteraccionCRM i
    LEFT JOIN Usuario u ON u.IdUsuario = i.IdUsuario
    LEFT JOIN ContactoEmpresa ce ON ce.IdContactoEmpresa = i.IdContactoEmpresa
    WHERE i.IdProspecto = @IdProspecto
    ORDER BY i.Fecha DESC, i.IdInteraccion DESC;

    SELECT TOP (100) s.IdSeguimiento, s.Tipo, s.FechaHora, s.Motivo, s.Prioridad, u.Nombre AS Responsable,
           CASE WHEN s.Estado = 'Pendiente' AND s.FechaHora < dbo.fn_CrmAhora() THEN 'Atrasado' ELSE s.Estado END AS Estado,
           s.Origen, s.Resultado, s.MotivoCancelacion
    FROM SeguimientoCRM s
    LEFT JOIN Usuario u ON u.IdUsuario = s.IdResponsable
    WHERE s.IdProspecto = @IdProspecto
    ORDER BY CASE WHEN s.Estado IN ('Pendiente', 'Atrasado') THEN 0 ELSE 1 END,
             CASE WHEN s.Estado IN ('Pendiente', 'Atrasado') THEN s.FechaHora END ASC,
             s.FechaHora DESC, s.IdSeguimiento DESC;

    SELECT h.IdHistorial, h.EstadoAnterior, h.EstadoNuevo, h.Motivo, h.Observacion, u.Nombre AS Usuario, TODATETIMEOFFSET(h.Fecha, '+00:00') AS Fecha
    FROM ProspectoEstadoHistorial h
    LEFT JOIN Usuario u ON u.IdUsuario = h.IdUsuario
    WHERE h.IdProspecto = @IdProspecto
    ORDER BY h.Fecha DESC, h.IdHistorial DESC;
END
