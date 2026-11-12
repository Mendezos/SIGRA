-- Cotizaciones de una empresa del CRM (prospecto o cliente), para relacionarlas con una interacción (CRMGPSC-013).
-- Más recientes primero.
CREATE PROCEDURE [dbo].[sp_CrmInteraccion_Cotizaciones]
    @TipoEmpresa VARCHAR(10),
    @IdEmpresa   INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT c.IdCotizacion, c.Fecha, c.Monto, c.Moneda, c.Estado
    FROM Cotizacion c
    WHERE (@TipoEmpresa = 'Prospecto' AND c.IdProspecto = @IdEmpresa)
       OR (@TipoEmpresa = 'Cliente' AND c.IdCliente = @IdEmpresa)
    ORDER BY c.Fecha DESC, c.IdCotizacion DESC;
END
