CREATE PROCEDURE [dbo].[sp_Ticket_GarantiaSeguimiento]
    @IdGarantia BIGINT,@IdUsuario INT,@Estado NVARCHAR(50),@Nota NVARCHAR(1000)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF @Estado NOT IN (N'En trámite',N'Resuelto por el proveedor',N'Rechazado por el proveedor') OR NULLIF(LTRIM(RTRIM(@Nota)),N'') IS NULL
        THROW 50001, 'Seleccione un estado de seguimiento e indique una nota.', 1;
    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @IdTicket INT=(SELECT IdTicket FROM GarantiaTicket WITH (UPDLOCK,HOLDLOCK) WHERE IdGarantia=@IdGarantia);
        IF @IdTicket IS NULL THROW 50001, 'El caso de garantía no existe.', 1;
        INSERT GarantiaSeguimiento (IdGarantia,IdUsuario,Estado,Nota) VALUES (@IdGarantia,@IdUsuario,@Estado,@Nota);
        DECLARE @Detalle NVARCHAR(MAX)=(SELECT @Estado AS estadoGarantia,@Nota AS nota FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
        INSERT Auditoria (IdUsuario,Modulo,Entidad,IdEntidad,Accion,Detalle)
        VALUES (@IdUsuario,'GTST','Ticket',@IdTicket,'GARANTIA_SEGUIMIENTO',@Detalle);
        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        THROW;
    END CATCH;
END;
