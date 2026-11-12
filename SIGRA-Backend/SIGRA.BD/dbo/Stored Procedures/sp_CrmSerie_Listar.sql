-- Series de contactos periódicos (CRMGPSC-024) con el avance de sus seguimientos: total, completados, pendientes (Pendiente +
-- Atrasado), atrasados, cancelados y la próxima fecha pendiente (el siguiente seguimiento aún Pendiente, o NULL si no hay).
-- Filtros opcionales: @IdSerie, @IdResponsable, @Estado (Activa | Cancelada) y @Texto (empresa, contacto o motivo, sin distinguir
-- tildes ni mayúsculas). Las más recientes primero. Hora se devuelve como 'HH:mm'.
-- Quien lo llama debe ejecutar antes sp_CrmSeguimiento_MarcarAtrasados (lo hace la capa de datos).
CREATE PROCEDURE [dbo].[sp_CrmSerie_Listar]
    @IdSerie       INT = NULL,
    @IdResponsable INT = NULL,
    @Estado        VARCHAR(15) = NULL,
    @Texto         NVARCHAR(150) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TextoBuscado NVARCHAR(150) = NULLIF(LTRIM(RTRIM(@Texto)), N'');

    SELECT s.IdSerie,
           CASE WHEN s.IdProspecto IS NOT NULL THEN 'Prospecto' ELSE 'Cliente' END AS TipoEmpresa,
           COALESCE(s.IdProspecto, s.IdCliente) AS IdEmpresa,
           COALESCE(p.Empresa, c.Empresa) AS Empresa,
           s.IdContactoEmpresa, ce.Nombre AS Contacto,
           s.Periodicidad, s.FechaInicial, LEFT(CONVERT(VARCHAR(8), s.Hora, 108), 5) AS Hora,
           s.Tipo, s.Motivo, s.Prioridad,
           s.IdResponsable, ur.Nombre AS Responsable,
           s.Estado, s.OcurrenciasGeneradas,
           ISNULL(x.Total, 0) AS Total, ISNULL(x.Completados, 0) AS Completados, ISNULL(x.Pendientes, 0) AS Pendientes,
           ISNULL(x.Atrasados, 0) AS Atrasados, ISNULL(x.Cancelados, 0) AS Cancelados, x.ProximaFecha,
           s.MotivoCancelacion, TODATETIMEOFFSET(s.FechaCancelacion, '+00:00') AS FechaCancelacion,
           s.IdUsuarioCancela, ucan.Nombre AS UsuarioCancela,
           TODATETIMEOFFSET(s.FechaCreacion, '+00:00') AS FechaCreacion, ucre.Nombre AS CreadoPor
    FROM SerieContactoCRM s
    LEFT JOIN Prospecto p ON p.IdProspecto = s.IdProspecto
    LEFT JOIN Cliente c ON c.IdCliente = s.IdCliente
    LEFT JOIN ContactoEmpresa ce ON ce.IdContactoEmpresa = s.IdContactoEmpresa
    LEFT JOIN Usuario ur ON ur.IdUsuario = s.IdResponsable
    LEFT JOIN Usuario ucan ON ucan.IdUsuario = s.IdUsuarioCancela
    LEFT JOIN Usuario ucre ON ucre.IdUsuario = s.IdUsuarioCrea
    OUTER APPLY (SELECT COUNT(*) AS Total,
                        SUM(CASE WHEN g.Estado = 'Completado' THEN 1 ELSE 0 END) AS Completados,
                        SUM(CASE WHEN g.Estado IN ('Pendiente', 'Atrasado') THEN 1 ELSE 0 END) AS Pendientes,
                        SUM(CASE WHEN g.Estado = 'Atrasado' THEN 1 ELSE 0 END) AS Atrasados,
                        SUM(CASE WHEN g.Estado = 'Cancelado' THEN 1 ELSE 0 END) AS Cancelados,
                        MIN(CASE WHEN g.Estado = 'Pendiente' THEN g.FechaHora END) AS ProximaFecha
                 FROM SeguimientoCRM g WHERE g.IdSerie = s.IdSerie) x
    WHERE (@IdSerie IS NULL OR s.IdSerie = @IdSerie)
      AND (@IdResponsable IS NULL OR s.IdResponsable = @IdResponsable)
      AND (@Estado IS NULL OR s.Estado = @Estado)
      AND (@TextoBuscado IS NULL
           OR CHARINDEX(@TextoBuscado COLLATE Latin1_General_CI_AI, COALESCE(p.Empresa, c.Empresa) COLLATE Latin1_General_CI_AI) > 0
           OR CHARINDEX(@TextoBuscado COLLATE Latin1_General_CI_AI, ISNULL(ce.Nombre, '') COLLATE Latin1_General_CI_AI) > 0
           OR CHARINDEX(@TextoBuscado COLLATE Latin1_General_CI_AI, s.Motivo COLLATE Latin1_General_CI_AI) > 0)
    ORDER BY s.IdSerie DESC;
END
