-- CRMGPSC-007: desactiva un contacto (motivo obligatorio). Conserva sus interacciones y seguimientos pasados; los selectores solo listan activos.
-- Si es el contacto principal activo y la empresa tiene otros contactos activos, exige @IdNuevoPrincipal (otro contacto ACTIVO de la misma empresa).
-- El contacto desactivado conserva su marca de principal: si se reactiva y nadie más la tiene, la recupera.
-- Devuelve una fila: Resultado = 'Aplicado' | 'SinCambios' (ya estaba inactivo), Nombre del contacto y NombreNuevoPrincipal.
CREATE PROCEDURE [dbo].[sp_CrmContacto_Desactivar]
    @IdContactoEmpresa  INT,
    @Motivo             VARCHAR(300),
    @IdNuevoPrincipal   INT = NULL,
    @IdUsuario          INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Bloqueo INT, @Recurso NVARCHAR(100), @Tipo VARCHAR(10), @IdEmpresa INT, @IdProspecto INT, @IdCliente INT;
    DECLARE @Activo BIT, @EsPrincipal BIT, @Nombre VARCHAR(150), @NombreNuevo VARCHAR(150), @HayOtros BIT = 0;

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

    IF @Activo = 0
    BEGIN
        COMMIT TRANSACTION;
        SELECT 'SinCambios' AS Resultado, @Nombre AS Nombre, CAST(NULL AS VARCHAR(150)) AS NombreNuevoPrincipal;
        RETURN;
    END;

    IF EXISTS (SELECT 1 FROM ContactoEmpresa ce
               WHERE ((@Tipo = 'Prospecto' AND ce.IdProspecto = @IdEmpresa) OR (@Tipo = 'Cliente' AND ce.IdCliente = @IdEmpresa))
                 AND ce.Activo = 1 AND ce.IdContactoEmpresa <> @IdContactoEmpresa)
        SET @HayOtros = 1;

    IF @EsPrincipal = 1 AND @HayOtros = 1
    BEGIN
        IF @IdNuevoPrincipal IS NULL
            THROW 50001, N'Elija otro contacto activo como principal antes de desactivar.', 1;

        SELECT @NombreNuevo = ce.Nombre FROM ContactoEmpresa ce
        WHERE ce.IdContactoEmpresa = @IdNuevoPrincipal AND ce.IdContactoEmpresa <> @IdContactoEmpresa AND ce.Activo = 1
          AND ((@Tipo = 'Prospecto' AND ce.IdProspecto = @IdEmpresa) OR (@Tipo = 'Cliente' AND ce.IdCliente = @IdEmpresa));
        IF @NombreNuevo IS NULL
            THROW 50001, N'El contacto elegido como nuevo principal debe ser un contacto activo de la misma empresa.', 1;
    END;

    UPDATE ContactoEmpresa
    SET Activo = 0, MotivoDesactivacion = @Motivo, FechaDesactivacion = SYSUTCDATETIME(), IdUsuarioDesactiva = @IdUsuario,
        FechaActualizacion = SYSUTCDATETIME()
    WHERE IdContactoEmpresa = @IdContactoEmpresa;

    IF @NombreNuevo IS NOT NULL
        UPDATE ContactoEmpresa SET EsPrincipal = 1, FechaActualizacion = SYSUTCDATETIME() WHERE IdContactoEmpresa = @IdNuevoPrincipal;

    COMMIT TRANSACTION;

    SELECT 'Aplicado' AS Resultado, @Nombre AS Nombre, @NombreNuevo AS NombreNuevoPrincipal;
END
