CREATE PROCEDURE [dbo].[sp_Ticket_Seguimiento] @Codigo VARCHAR(32) = NULL, @Empresa NVARCHAR(150) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT NumeroBoleta, Empresa, CASE WHEN Activo = 0 THEN N'Inactiva' ELSE Estado END AS Estado,
           TipoServicio, FechaRecepcion
    FROM vw_TicketDetalle
    WHERE (@Codigo IS NOT NULL AND CodigoSeguimiento = @Codigo)
       OR (@Codigo IS NULL AND @Empresa IS NOT NULL AND Empresa LIKE '%' + @Empresa + '%')
    ORDER BY NumeroBoleta DESC;
END;
