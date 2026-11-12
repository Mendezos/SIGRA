-- CRMGPSC-007: reactiva un contacto inactivo (vuelve a ser seleccionable en seguimientos). Si tenía marca de principal y la empresa ya tiene
-- otro principal activo, se reactiva SIN la marca de principal (SinMarcaPrincipal = 1).
-- Devuelve una fila: Resultado = 'Aplicado' | 'SinCambios' (ya estaba activo), Nombre y SinMarcaPrincipal.
CREATE PROCEDURE [dbo].[sp_CrmContacto_Reactivar]
    @IdContactoEmpresa  INT,
    @IdUsuario          INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Bloqueo INT, @Recurso NVARCHAR(100), @Tipo VARCHAR(10), @IdEmpresa INT, @IdProspecto INT, @IdCliente INT;
    DECLARE @Activo BIT, @EsPrincipal BIT, @Nombre VARCHAR(150), @SinMarca BIT = 0;

    SELECT @IdProspecto = IdProspecto, @IdCliente = IdCliente FROM ContactoEmpresa WHERE IdContactoEmpresa = @IdContactoEmpresa;
    IF @IdProspecto IS NULL AND @IdCliente IS NULL THROW 50001, N'El contacto indicado no existe.', 1;
    SET @Tipo = CASE WHEN @IdProspecto IS NOT NULL THEN 'Prospecto' ELSE 'Cliente' END;
    SET @IdEmpresa = ISNULL(@IdProspecto, @IdCliente);
    SET @Recurso = N'CrmContacto_' + @Tipo + N'_' + CAST(@IdEmpresa AS NVARCHAR(10));

    BEGIN TRANSACTION;

    EXEC @Bloqueo = sp_getapplock @Resource = @Recurso, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
    IF @Bloqueo < 0 THROW 50001, N'El sistema está ocupado actualizando los contactos de esta empresa. Intente nuevamente.', 1;

    SELECT @Activo = ce.Activo, @EsPrincipal = ce.EsPrincipal, @Nombre = ce.Nombre
    FROM ContactoEmpresa ce WITH (UPDLOCK, HOLDLOCK)
    WHERE ce.IdContactoEmpresa = @IdContactoEmpresa;

    IF @Activo IS NULL THROW 50001, N'El contacto indicado no existe.', 1;

    IF @Activo = 1
    BEGIN
        COMMIT TRANSACTION;
        SELECT 'SinCambios' AS Resultado, @Nombre AS Nombre, CAST(0 AS BIT) AS SinMarcaPrincipal;
        RETURN;
    END;

    IF @EsPrincipal = 1 AND EXISTS (
        SELECT 1 FROM ContactoEmpresa ce
        WHERE ((@Tipo = 'Prospecto' AND ce.IdProspecto = @IdEmpresa) OR (@Tipo = 'Cliente' AND ce.IdCliente = @IdEmpresa))
          AND ce.EsPrincipal = 1 AND ce.Activo = 1 AND ce.IdContactoEmpresa <> @IdContactoEmpresa)
        SET @SinMarca = 1;

    UPDATE ContactoEmpresa
    SET Activo = 1, EsPrincipal = CASE WHEN @SinMarca = 1 THEN 0 ELSE EsPrincipal END,
        MotivoDesactivacion = NULL, FechaDesactivacion = NULL, IdUsuarioDesactiva = NULL, FechaActualizacion = SYSUTCDATETIME()
    WHERE IdContactoEmpresa = @IdContactoEmpresa;

    COMMIT TRANSACTION;

    SELECT 'Aplicado' AS Resultado, @Nombre AS Nombre, @SinMarca AS SinMarcaPrincipal;
END
