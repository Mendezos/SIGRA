-- Registra la compra de una batería (CRMGPSC-025): calcula la fecha de recordatorio (compra + @MesesAviso meses) y, si el cliente
-- ya tenía recordatorios abiertos de la misma batería, los cierra en la misma transacción (cambio anticipado).
-- Devuelve dos conjuntos de resultados: (1) el IdRecordatorio nuevo y (2) los IdRecordatorio que quedaron cerrados por esta compra.
-- Las reglas de validación (cliente activo, cantidad, fecha, contacto, factura, modelo, vendedor) están en sp_CrmBateria_Crear.
CREATE PROCEDURE [dbo].[sp_CrmBateria_Registrar]
    @IdCliente         INT,
    @IdContactoEmpresa INT          = NULL,
    @IdFactura         INT          = NULL,
    @NumeroFactura     VARCHAR(30)  = NULL,
    @IdModelo          INT          = NULL,
    @ModeloBateria     VARCHAR(150) = NULL,
    @Cantidad          INT,
    @FechaCompra       DATE,
    @IdVendedor        INT,
    @IdUsuario         INT          = NULL,
    @MesesAviso        INT          = 11
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IdRecordatorio INT, @Omitido NVARCHAR(300);

    EXEC dbo.sp_CrmBateria_Crear
        @IdCliente = @IdCliente, @IdContactoEmpresa = @IdContactoEmpresa, @IdFactura = @IdFactura, @NumeroFactura = @NumeroFactura,
        @IdModelo = @IdModelo, @ModeloBateria = @ModeloBateria, @Cantidad = @Cantidad, @FechaCompra = @FechaCompra,
        @IdVendedor = @IdVendedor, @IdUsuario = @IdUsuario, @MesesAviso = @MesesAviso, @Estricto = 1,
        @IdRecordatorio = @IdRecordatorio OUTPUT, @Omitido = @Omitido OUTPUT;

    SELECT @IdRecordatorio AS IdRecordatorio;

    SELECT r.IdRecordatorio
    FROM RecordatorioBateria r
    WHERE r.IdRecordatorioNuevo = @IdRecordatorio
    ORDER BY r.IdRecordatorio;
END
