-- Fecha de la ocurrencia número @Indice (0 = la inicial) de una serie de contactos periódicos.
-- Siempre se calcula desde la fecha inicial (no desde la ocurrencia anterior) para que un día 31 no se "arrastre" al 28/30
-- en los meses siguientes: 31-ene, 28-feb, 31-mar, 30-abr...
CREATE FUNCTION [dbo].[fn_CrmSerie_Fecha] (@FechaInicial DATE, @Periodicidad VARCHAR (15), @Indice INT)
RETURNS DATE
AS
BEGIN
    RETURN DATEADD(MONTH,
        @Indice * CASE @Periodicidad WHEN 'Mensual' THEN 1 WHEN 'Trimestral' THEN 3 WHEN 'Semestral' THEN 6 ELSE 1 END,
        @FechaInicial);
END
