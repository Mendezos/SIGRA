-- CRMGPSC-002/003/004: datos de un prospecto (sin filas = no existe). FechaIngreso es la fecha en Costa Rica; FechaCreacion viene en UTC.
-- FechaDescarte es la fecha y hora de pared de Costa Rica en que se registró el descarte.
CREATE PROCEDURE [dbo].[sp_CrmProspecto_Obtener]
    @IdProspecto INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT p.IdProspecto, p.Empresa, p.Contacto, p.Correo, p.Telefono, p.Estado, p.Sector, p.Direccion, p.TamanoFlota, p.Fuente,
           p.IdVendedor, v.Nombre AS Vendedor, CAST(ISNULL(v.Activo, 0) AS BIT) AS VendedorActivo,
           p.FechaIngreso, p.JustificacionDuplicado, p.MotivoDescarte, p.ObservacionDescarte, p.FechaDescarte,
           p.IdCliente, c.Empresa AS ClienteEmpresa,
           TODATETIMEOFFSET(p.FechaCreacion, '+00:00') AS FechaCreacion, uc.Nombre AS CreadoPor
    FROM Prospecto p
    LEFT JOIN Usuario v ON v.IdUsuario = p.IdVendedor
    LEFT JOIN Cliente c ON c.IdCliente = p.IdCliente
    LEFT JOIN Usuario uc ON uc.IdUsuario = p.IdUsuarioCrea
    WHERE p.IdProspecto = @IdProspecto;
END
