-- CRMGPSC-026: detalle de un evento del historial del CRM y los demás eventos de la misma empresa (prospecto o cliente).
-- Primer conjunto: el evento. Segundo conjunto: los eventos relacionados (hasta 30, el más reciente primero).
CREATE PROCEDURE [dbo].[sp_CrmAuditoria_Detalle]
    @IdAuditoria BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @IdProspecto INT, @IdCliente INT;
    SELECT @IdProspecto = IdProspecto, @IdCliente = IdCliente FROM dbo.vw_CrmAuditoria WHERE IdAuditoria = @IdAuditoria;

    SELECT IdAuditoria, Entidad, IdEntidad, Accion, Detalle, IdAutor, Autor, Fecha, Empresa, Vendedor
    FROM dbo.vw_CrmAuditoria WHERE IdAuditoria = @IdAuditoria;

    SELECT TOP (30) IdAuditoria, Entidad, IdEntidad, Accion, Detalle, IdAutor, Autor, Fecha, Empresa, Vendedor
    FROM dbo.vw_CrmAuditoria
    WHERE IdAuditoria <> @IdAuditoria
      AND ((@IdProspecto IS NOT NULL AND IdProspecto = @IdProspecto) OR (@IdCliente IS NOT NULL AND IdCliente = @IdCliente))
    ORDER BY Fecha DESC, IdAuditoria DESC;
END
