-- Recordatorios de baterías (CRMGPSC-025) con sus filtros: estado, vendedor responsable, cliente (texto, sin distinguir mayúsculas
-- ni tildes) y rango de fecha de recordatorio. Los abiertos (Pendiente/Notificado) van primero, del más próximo al más lejano;
-- luego los finalizados, del más reciente al más antiguo.
-- DiasRestantes: días desde hoy (hora de Costa Rica) hasta la fecha de recordatorio; negativo = vencido. Las marcas del sistema (Fecha*) van en UTC.
-- IdsReemplazados: recordatorios anteriores que esta compra cerró (cambio anticipado), separados por coma.
CREATE PROCEDURE [dbo].[sp_CrmBateria_Listar]
    @Estado     VARCHAR(15)  = NULL,
    @IdVendedor INT          = NULL,
    @Cliente    VARCHAR(150) = NULL,
    @Desde      DATE         = NULL,
    @Hasta      DATE         = NULL,
    @IdCliente  INT          = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Hoy DATE = CONVERT(date, dbo.fn_CrmAhora());
    DECLARE @Patron NVARCHAR(400) = NULL;
    SET @Cliente = NULLIF(LTRIM(RTRIM(@Cliente)), '');
    IF @Cliente IS NOT NULL
        SET @Patron = N'%' + REPLACE(REPLACE(REPLACE(@Cliente, '[', '[[]'), '%', '[%]'), '_', '[_]') + N'%';

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
    WHERE (@Estado IS NULL OR r.Estado = @Estado)
      AND (@IdVendedor IS NULL OR r.IdVendedor = @IdVendedor)
      AND (@IdCliente IS NULL OR r.IdCliente = @IdCliente)
      AND (@Patron IS NULL OR c.Empresa COLLATE Latin1_General_CI_AI LIKE @Patron)
      AND (@Desde IS NULL OR r.FechaRecordatorio >= @Desde)
      AND (@Hasta IS NULL OR r.FechaRecordatorio <= @Hasta)
    ORDER BY CASE WHEN r.Estado IN ('Pendiente', 'Notificado') THEN 0 ELSE 1 END,
             CASE WHEN r.Estado IN ('Pendiente', 'Notificado') THEN r.FechaRecordatorio END ASC,
             CASE WHEN r.Estado NOT IN ('Pendiente', 'Notificado') THEN r.FechaRecordatorio END DESC,
             r.IdRecordatorio DESC;
END
