-- Un recordatorio de batería con todos sus datos y el seguimiento de la atención (mismas columnas que sp_CrmBateria_Listar).
-- Sin filas = el recordatorio no existe.
CREATE PROCEDURE [dbo].[sp_CrmBateria_Obtener]
    @IdRecordatorio INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Hoy DATE = CONVERT(date, dbo.fn_CrmAhora());

    SELECT r.IdRecordatorio, r.IdCliente, c.Empresa AS Cliente,
           r.IdContactoEmpresa, ISNULL(ct.Nombre, pr.Nombre) AS Contacto,
           ISNULL(ct.Telefono, pr.Telefono) AS ContactoTelefono, ISNULL(ct.Correo, pr.Correo) AS ContactoCorreo,
           r.IdFactura, r.NumeroFactura, r.IdModelo, r.ModeloBateria, r.Cantidad, r.FechaCompra, r.FechaRecordatorio,
           r.IdVendedor, v.Nombre AS Vendedor, v.Activo AS VendedorActivo, r.Estado,
           DATEDIFF(DAY, @Hoy, r.FechaRecordatorio) AS DiasRestantes,
           TODATETIMEOFFSET(r.FechaNotificacion, '+00:00') AS FechaNotificacion,
           TODATETIMEOFFSET(r.FechaAtencion, '+00:00') AS FechaAtencion,
           r.MedioAtencion, r.ResultadoAtencion, r.ObservacionAtencion, r.ProximoPasoAtencion,
           r.IdUsuarioAtencion, ua.Nombre AS UsuarioAtencion,
           r.IdRecordatorioNuevo, r.MotivoCierre, TODATETIMEOFFSET(r.FechaCierre, '+00:00') AS FechaCierre,
           TODATETIMEOFFSET(r.FechaCreacion, '+00:00') AS FechaCreacion,
           (SELECT STRING_AGG(CONVERT(VARCHAR(10), x.IdRecordatorio), ',') WITHIN GROUP (ORDER BY x.IdRecordatorio)
            FROM RecordatorioBateria x WHERE x.IdRecordatorioNuevo = r.IdRecordatorio) AS IdsReemplazados
    FROM RecordatorioBateria r
    INNER JOIN Cliente c ON c.IdCliente = r.IdCliente
    INNER JOIN Usuario v ON v.IdUsuario = r.IdVendedor
    LEFT JOIN ContactoEmpresa ct ON ct.IdContactoEmpresa = r.IdContactoEmpresa
    OUTER APPLY (SELECT TOP (1) x.Nombre, x.Telefono, x.Correo FROM ContactoEmpresa x
                 WHERE x.IdCliente = r.IdCliente AND x.EsPrincipal = 1 AND x.Activo = 1) pr
    LEFT JOIN Usuario ua ON ua.IdUsuario = r.IdUsuarioAtencion
    WHERE r.IdRecordatorio = @IdRecordatorio;
END
