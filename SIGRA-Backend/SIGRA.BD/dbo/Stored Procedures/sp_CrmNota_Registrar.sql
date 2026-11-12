-- CRMGPSC-013: registra una nota comercial sobre un prospecto o cliente (no es un contacto directo).
-- La fecha y hora de la nota las pone el servidor (UTC, columna Fecha). Visibilidad: Privada (solo el autor), Equipo o General.
-- Devuelve la nota creada.
CREATE PROCEDURE [dbo].[sp_CrmNota_Registrar]
    @TipoEmpresa VARCHAR(10),
    @IdEmpresa   INT,
    @IdUsuario   INT,
    @Categoria   VARCHAR(30),
    @Texto       VARCHAR(MAX),
    @Visibilidad VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Estado VARCHAR(30), @Activo BIT, @IdNota INT;

    IF @TipoEmpresa NOT IN ('Prospecto', 'Cliente')
        THROW 50001, N'El tipo de empresa debe ser Prospecto o Cliente.', 1;

    IF @Categoria NOT IN ('General', 'Comercial', 'Técnica', 'Facturación', 'Otra')
        THROW 50001, N'La categoría de la nota no es válida.', 1;

    IF @Visibilidad NOT IN ('Privada', 'Equipo', 'General')
        THROW 50001, N'La visibilidad de la nota debe ser Privada, Equipo o General.', 1;

    IF LEN(@Texto) > 2000
        THROW 50001, N'El texto de la nota no puede superar los 2000 caracteres.', 1;

    BEGIN TRANSACTION;

    IF @TipoEmpresa = 'Prospecto'
        SELECT @Estado = Estado FROM Prospecto WITH (UPDLOCK, HOLDLOCK) WHERE IdProspecto = @IdEmpresa;
    ELSE
        SELECT @Estado = CASE WHEN Activo = 1 THEN 'Activo' ELSE 'Inactivo' END, @Activo = Activo
        FROM Cliente WITH (UPDLOCK, HOLDLOCK) WHERE IdCliente = @IdEmpresa;

    IF @Estado IS NULL
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'La empresa indicada no existe.', 1;
    END

    IF @TipoEmpresa = 'Prospecto' AND @Estado = 'Descartado'
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'No se pueden registrar notas en un prospecto descartado; reactívelo primero.', 1;
    END

    IF @TipoEmpresa = 'Prospecto' AND @Estado = 'Convertido'
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'No se pueden registrar notas en un prospecto convertido; regístrela en el cliente.', 1;
    END

    IF @TipoEmpresa = 'Cliente' AND @Activo = 0
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50001, N'El cliente está inactivo.', 1;
    END

    INSERT INTO NotaCRM (IdProspecto, IdCliente, Categoria, Texto, Visibilidad, IdUsuario)
    VALUES (CASE WHEN @TipoEmpresa = 'Prospecto' THEN @IdEmpresa END,
            CASE WHEN @TipoEmpresa = 'Cliente' THEN @IdEmpresa END,
            @Categoria, @Texto, @Visibilidad, @IdUsuario);

    SET @IdNota = SCOPE_IDENTITY();

    COMMIT TRANSACTION;

    SELECT n.IdNota,
           @TipoEmpresa AS TipoEmpresa,
           @IdEmpresa AS IdEmpresa,
           COALESCE(p.Empresa, c.Empresa) AS Empresa,
           n.Categoria, n.Texto, n.Visibilidad,
           n.IdUsuario, u.Nombre AS Autor,
           TODATETIMEOFFSET(n.Fecha, '+00:00') AS Fecha
    FROM NotaCRM n
    JOIN Usuario u ON u.IdUsuario = n.IdUsuario
    LEFT JOIN Prospecto p ON p.IdProspecto = n.IdProspecto
    LEFT JOIN Cliente c ON c.IdCliente = n.IdCliente
    WHERE n.IdNota = @IdNota;
END
