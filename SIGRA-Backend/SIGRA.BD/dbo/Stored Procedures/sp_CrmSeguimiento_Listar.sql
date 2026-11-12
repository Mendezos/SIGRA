-- Seguimientos del CRM (agenda, CRMGPSC-016). Todos los filtros son opcionales y se combinan:
--   @IdResponsable, rango de fechas del seguimiento (@Desde y @Hasta, ambos inclusivos y en hora de Costa Rica),
--   @Prioridad, @Tipo, @Estado (uno concreto) o @SoloAbiertos = 1 (Pendiente y Atrasado), @Texto (empresa, contacto o motivo,
--   sin distinguir tildes ni mayúsculas), @IdSerie y @IdSeguimiento.
-- Orden: fecha y hora ascendente. MinutosAtraso = tiempo transcurrido desde la fecha programada (solo si está Atrasado).
-- Quien lo llama debe ejecutar antes sp_CrmSeguimiento_MarcarAtrasados (lo hace la capa de datos).
CREATE PROCEDURE [dbo].[sp_CrmSeguimiento_Listar]
    @IdSeguimiento INT = NULL,
    @IdSerie       INT = NULL,
    @IdResponsable INT = NULL,
    @Desde         DATE = NULL,
    @Hasta         DATE = NULL,
    @Prioridad     VARCHAR(10) = NULL,
    @Tipo          VARCHAR(20) = NULL,
    @Estado        VARCHAR(15) = NULL,
    @SoloAbiertos  BIT = 0,
    @Texto         NVARCHAR(150) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Ahora DATETIME2(0) = dbo.fn_CrmAhora();
    DECLARE @HastaExclusivo DATETIME2(0) = CASE WHEN @Hasta IS NULL THEN NULL ELSE DATEADD(DAY, 1, CAST(@Hasta AS DATETIME2(0))) END;
    DECLARE @TextoBuscado NVARCHAR(150) = NULLIF(LTRIM(RTRIM(@Texto)), N'');

    SELECT s.IdSeguimiento,
           CASE WHEN s.IdProspecto IS NOT NULL THEN 'Prospecto' ELSE 'Cliente' END AS TipoEmpresa,
           COALESCE(s.IdProspecto, s.IdCliente) AS IdEmpresa,
           COALESCE(p.Empresa, c.Empresa) AS Empresa,
           s.IdContactoEmpresa, ce.Nombre AS Contacto,
           s.Tipo, s.FechaHora, s.FechaHoraOriginal, s.Motivo, s.Prioridad,
           s.IdResponsable, ur.Nombre AS Responsable,
           s.Estado, s.Origen, s.IdSerie,
           s.FechaReal, s.Resultado, s.Observaciones, s.ProximoPaso, s.MotivoCancelacion,
           TODATETIMEOFFSET(s.FechaCierre, '+00:00') AS FechaCierre, s.IdUsuarioCierre, ucie.Nombre AS UsuarioCierre,
           s.IdInteraccion,
           CASE WHEN s.Estado = 'Atrasado' THEN DATEDIFF(MINUTE, s.FechaHora, @Ahora) END AS MinutosAtraso,
           TODATETIMEOFFSET(s.FechaCreacion, '+00:00') AS FechaCreacion, ucre.Nombre AS CreadoPor
    FROM SeguimientoCRM s
    LEFT JOIN Prospecto p ON p.IdProspecto = s.IdProspecto
    LEFT JOIN Cliente c ON c.IdCliente = s.IdCliente
    LEFT JOIN ContactoEmpresa ce ON ce.IdContactoEmpresa = s.IdContactoEmpresa
    LEFT JOIN Usuario ur ON ur.IdUsuario = s.IdResponsable
    LEFT JOIN Usuario ucie ON ucie.IdUsuario = s.IdUsuarioCierre
    LEFT JOIN Usuario ucre ON ucre.IdUsuario = s.IdUsuarioCrea
    WHERE (@IdSeguimiento IS NULL OR s.IdSeguimiento = @IdSeguimiento)
      AND (@IdSerie IS NULL OR s.IdSerie = @IdSerie)
      AND (@IdResponsable IS NULL OR s.IdResponsable = @IdResponsable)
      AND (@Desde IS NULL OR s.FechaHora >= CAST(@Desde AS DATETIME2(0)))
      AND (@HastaExclusivo IS NULL OR s.FechaHora < @HastaExclusivo)
      AND (@Prioridad IS NULL OR s.Prioridad = @Prioridad)
      AND (@Tipo IS NULL OR s.Tipo = @Tipo)
      AND (@Estado IS NULL OR s.Estado = @Estado)
      AND (@SoloAbiertos = 0 OR s.Estado IN ('Pendiente', 'Atrasado'))
      AND (@TextoBuscado IS NULL
           OR CHARINDEX(@TextoBuscado COLLATE Latin1_General_CI_AI, COALESCE(p.Empresa, c.Empresa) COLLATE Latin1_General_CI_AI) > 0
           OR CHARINDEX(@TextoBuscado COLLATE Latin1_General_CI_AI, ISNULL(ce.Nombre, '') COLLATE Latin1_General_CI_AI) > 0
           OR CHARINDEX(@TextoBuscado COLLATE Latin1_General_CI_AI, s.Motivo COLLATE Latin1_General_CI_AI) > 0)
    ORDER BY s.FechaHora ASC, s.IdSeguimiento ASC;
END
