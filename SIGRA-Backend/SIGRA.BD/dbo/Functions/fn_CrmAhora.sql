-- Hora actual de Costa Rica (UTC-6, sin horario de verano), sin importar la zona horaria del servidor de SQL Server.
-- Las fechas y horas que el usuario programa en el CRM (seguimientos, series, recordatorios) se guardan como hora local
-- de Costa Rica, así que todas las comparaciones "ya pasó / es hoy" deben hacerse contra esta función.
CREATE FUNCTION [dbo].[fn_CrmAhora] ()
RETURNS DATETIME2 (0)
AS
BEGIN
    RETURN CONVERT(DATETIME2(0), SYSDATETIMEOFFSET() AT TIME ZONE 'Central America Standard Time');
END
