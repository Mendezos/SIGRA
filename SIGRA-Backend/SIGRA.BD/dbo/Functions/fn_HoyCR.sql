-- Fecha de hoy en Costa Rica (UTC-6, sin horario de verano), sin importar la zona horaria del servidor de SQL Server.
-- Azure SQL trabaja en UTC: después de las 6 p. m. en Costa Rica ya es "mañana" para el servidor, así que todo lo que compare
-- contra "hoy" (vencimientos, cancelaciones, estados de contratos y frecuencias) debe usar esta función y no GETDATE().
CREATE FUNCTION [dbo].[fn_HoyCR] ()
RETURNS DATE
AS
BEGIN
    RETURN CONVERT(DATE, dbo.fn_CrmAhora());
END
