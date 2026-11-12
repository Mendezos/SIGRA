-- CRMGPSC-002: lista de prospectos, los más recientes primero. Los filtros se combinan (todos deben cumplirse):
-- empresa (texto, sin tildes ni mayúsculas), sector, fuente, estado, vendedor y rango de fecha de ingreso.
-- "Contacto" es la persona de contacto principal activa; si no hay, el nombre de contacto guardado en el prospecto.
CREATE PROCEDURE [dbo].[sp_CrmProspecto_Listar]
    @Empresa     VARCHAR(150) = NULL,
    @Sector      VARCHAR(100) = NULL,
    @Fuente      VARCHAR(100) = NULL,
    @Estado      VARCHAR(30)  = NULL,
    @IdVendedor  INT          = NULL,
    @FechaDesde  DATE         = NULL,
    @FechaHasta  DATE         = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT p.IdProspecto, p.Empresa,
           ISNULL(pr.Nombre, p.Contacto) AS Contacto,
           p.Correo, p.Telefono, p.Estado, p.Sector, p.Direccion, p.TamanoFlota, p.Fuente,
           p.IdVendedor, v.Nombre AS Vendedor, CAST(ISNULL(v.Activo, 0) AS BIT) AS VendedorActivo,
           p.FechaIngreso, p.JustificacionDuplicado, p.MotivoDescarte, p.ObservacionDescarte, p.FechaDescarte,
           p.IdCliente, c.Empresa AS ClienteEmpresa,
           TODATETIMEOFFSET(p.FechaCreacion, '+00:00') AS FechaCreacion, uc.Nombre AS CreadoPor
    FROM Prospecto p
    LEFT JOIN Usuario v ON v.IdUsuario = p.IdVendedor
    LEFT JOIN Cliente c ON c.IdCliente = p.IdCliente
    LEFT JOIN Usuario uc ON uc.IdUsuario = p.IdUsuarioCrea
    OUTER APPLY (SELECT TOP 1 ce.Nombre FROM ContactoEmpresa ce
                 WHERE ce.IdProspecto = p.IdProspecto AND ce.Activo = 1 AND ce.EsPrincipal = 1) pr
    WHERE (@Empresa IS NULL OR p.Empresa COLLATE Latin1_General_CI_AI LIKE '%' + @Empresa + '%' COLLATE Latin1_General_CI_AI)
      AND (@Sector IS NULL OR p.Sector = @Sector)
      AND (@Fuente IS NULL OR p.Fuente = @Fuente)
      AND (@Estado IS NULL OR p.Estado = @Estado)
      AND (@IdVendedor IS NULL OR p.IdVendedor = @IdVendedor)
      AND (@FechaDesde IS NULL OR p.FechaIngreso >= @FechaDesde)
      AND (@FechaHasta IS NULL OR p.FechaIngreso <= @FechaHasta)
    ORDER BY p.FechaIngreso DESC, p.IdProspecto DESC;
END
