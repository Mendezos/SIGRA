-- Servicio de recordatorios del CRM (T-02). Un único proceso que, en este orden:
--   1) marca como "Atrasado" los seguimientos pendientes cuya hora ya pasó (sp_CrmSeguimiento_MarcarAtrasados);
--   2) extiende las series de contactos periódicos a los próximos 12 meses (sp_CrmSerie_Extender);
--   3) avisa de los seguimientos que llegaron a su hora (incluye las ocurrencias de contactos periódicos);
--   4) avisa de las baterías cuyo recordatorio (compra + 11 meses) llegó: el recordatorio pasa de "Pendiente" a "Notificado".
-- Cada aviso va a la campana del responsable y deja el correo en la cola (sp_Notificacion_Registrar). Si el responsable ya no está
-- activo, el aviso va a todos los administradores activos. Las empresas descartadas o inactivas no generan avisos.
-- Es idempotente (repetirlo no duplica avisos ni correos: se apoya en SeguimientoCRM.FechaAlerta, en el estado del recordatorio y en la
-- ClaveUnica de la notificación) y tolerante a fallos (si un aviso falla se cuenta en Errores y se sigue con el siguiente; el que
-- falló se reintenta en la siguiente vuelta). Todas las fechas se comparan con la hora de Costa Rica (fn_CrmAhora).
-- Un seguimiento reprogramado a una hora posterior vuelve a avisar (la ClaveUnica incluye la fecha y hora).
-- Devuelve una fila con los contadores: SeguimientosAtrasados, AlertasSeguimiento, SeriesExtendidas, OcurrenciasCreadas, BateriasNotificadas, Errores
-- (también salen por los parámetros OUTPUT; con @MostrarResultado = 0 no se devuelve la fila, útil para probarlo desde T-SQL).
CREATE PROCEDURE [dbo].[sp_CrmRecordatorio_Procesar]
    @SeguimientosAtrasados INT = NULL OUTPUT,
    @AlertasSeguimiento    INT = NULL OUTPUT,
    @SeriesExtendidas      INT = NULL OUTPUT,
    @OcurrenciasCreadas    INT = NULL OUTPUT,
    @BateriasNotificadas   INT = NULL OUTPUT,
    @Errores               INT = NULL OUTPUT,
    @MostrarResultado      BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT OFF;

    DECLARE @IdModulo INT = 9;   -- CRM y prospectos
    DECLARE @Ahora DATETIME2(0) = dbo.fn_CrmAhora();
    DECLARE @Hoy DATE = CONVERT(date, @Ahora);
    DECLARE @ErroresSeries INT = 0;
    SELECT @SeguimientosAtrasados = 0, @AlertasSeguimiento = 0, @SeriesExtendidas = 0, @OcurrenciasCreadas = 0, @BateriasNotificadas = 0, @Errores = 0;

    -- Administradores activos: reciben el aviso cuando el responsable ya no está activo.
    DECLARE @Admins TABLE (Id INT IDENTITY (1, 1) PRIMARY KEY, IdUsuario INT);
    INSERT @Admins (IdUsuario)
    SELECT u.IdUsuario FROM Usuario u INNER JOIN Rol r ON r.IdRol = u.IdRol
    WHERE u.Activo = 1 AND r.Nombre = 'Administrador del sistema' ORDER BY u.IdUsuario;
    DECLARE @TotalAdmins INT = (SELECT COUNT(*) FROM @Admins);

    -- ---------- 1) Seguimientos atrasados ----------
    BEGIN TRY
        DECLARE @Marcados TABLE (Marcados INT);
        INSERT @Marcados EXEC dbo.sp_CrmSeguimiento_MarcarAtrasados;
        SELECT @SeguimientosAtrasados = ISNULL(SUM(Marcados), 0) FROM @Marcados;
    END TRY
    BEGIN CATCH
        SET @Errores += 1;
    END CATCH;

    -- ---------- 2) Series de contactos periódicos ----------
    BEGIN TRY
        EXEC dbo.sp_CrmSerie_Extender @SeriesExtendidas = @SeriesExtendidas OUTPUT, @OcurrenciasCreadas = @OcurrenciasCreadas OUTPUT,
                                      @Errores = @ErroresSeries OUTPUT, @MostrarResultado = 0;
        SET @Errores += @ErroresSeries;
    END TRY
    BEGIN CATCH
        SET @Errores += 1;
    END CATCH;

    -- ---------- 3) Alertas de seguimientos ----------
    DECLARE @Seg TABLE (
        Id INT IDENTITY (1, 1) PRIMARY KEY, IdSeguimiento INT, IdResponsable INT, ResponsableActivo BIT, Responsable VARCHAR(150),
        Titulo NVARCHAR(200), Mensaje NVARCHAR(MAX), Clave NVARCHAR(150)
    );

    BEGIN TRY
        INSERT @Seg (IdSeguimiento, IdResponsable, ResponsableActivo, Responsable, Titulo, Mensaje, Clave)
        SELECT s.IdSeguimiento, s.IdResponsable, u.Activo, u.Nombre,
               N'Seguimiento: ' + ISNULL(c.Empresa, p.Empresa) + N' (' + s.Tipo + N')',
               N'Hora programada: ' + CONVERT(NVARCHAR(10), s.FechaHora, 103) + N' ' + CONVERT(NVARCHAR(5), s.FechaHora, 108)
                   + N'. Contacto: ' + ISNULL(ct.Nombre, N'Sin contacto específico')
                   + N'. Motivo: ' + s.Motivo
                   + N'. Prioridad: ' + s.Prioridad + N'.'
                   + CASE WHEN s.Origen = 'Serie' THEN N' Es un contacto periódico.' ELSE N'' END,
               N'SEG-' + CONVERT(NVARCHAR(10), s.IdSeguimiento) + N'-' + FORMAT(s.FechaHora, 'yyyyMMddHHmm')
        FROM SeguimientoCRM s
        INNER JOIN Usuario u ON u.IdUsuario = s.IdResponsable
        LEFT JOIN Prospecto p ON p.IdProspecto = s.IdProspecto
        LEFT JOIN Cliente c ON c.IdCliente = s.IdCliente
        LEFT JOIN ContactoEmpresa ct ON ct.IdContactoEmpresa = s.IdContactoEmpresa
        WHERE s.Estado IN ('Pendiente', 'Atrasado')
          AND s.FechaHora <= @Ahora
          AND (s.FechaAlerta IS NULL OR s.FechaAlerta < s.FechaHora)
          AND ((s.IdProspecto IS NOT NULL AND p.Estado NOT IN ('Convertido', 'Descartado')) OR (s.IdCliente IS NOT NULL AND c.Activo = 1))
        ORDER BY s.FechaHora, s.IdSeguimiento;
    END TRY
    BEGIN CATCH
        SET @Errores += 1;
    END CATCH;

    DECLARE @I INT = 1, @N INT = (SELECT COUNT(*) FROM @Seg), @J INT;
    DECLARE @IdSeg INT, @IdResp INT, @RespActivo BIT, @NombreResp VARCHAR(150), @Titulo NVARCHAR(200), @Mensaje NVARCHAR(MAX), @Clave NVARCHAR(150),
            @Destino INT, @Avisados INT, @IdNotif BIGINT;

    WHILE @I <= @N
    BEGIN
        SELECT @IdSeg = IdSeguimiento, @IdResp = IdResponsable, @RespActivo = ResponsableActivo, @NombreResp = Responsable,
               @Titulo = Titulo, @Mensaje = Mensaje, @Clave = Clave
        FROM @Seg WHERE Id = @I;

        BEGIN TRY
            SET @Avisados = 0;
            IF @RespActivo = 1
            BEGIN
                EXEC dbo.sp_Notificacion_Registrar @IdUsuario = @IdResp, @IdModulo = @IdModulo, @Titulo = @Titulo, @Mensaje = @Mensaje,
                     @Entidad = N'SeguimientoCRM', @IdEntidad = @IdSeg, @EnviarCorreo = 1, @Tipo = 'Seguimiento', @ClaveUnica = @Clave,
                     @IdNotificacion = @IdNotif OUTPUT;
                SET @Avisados = 1;
            END
            ELSE
            BEGIN
                SET @Mensaje = @Mensaje + N' El responsable (' + @NombreResp + N') ya no está activo: reasigne el seguimiento.';
                SET @J = 1;
                WHILE @J <= @TotalAdmins
                BEGIN
                    SELECT @Destino = IdUsuario FROM @Admins WHERE Id = @J;
                    EXEC dbo.sp_Notificacion_Registrar @IdUsuario = @Destino, @IdModulo = @IdModulo, @Titulo = @Titulo, @Mensaje = @Mensaje,
                         @Entidad = N'SeguimientoCRM', @IdEntidad = @IdSeg, @EnviarCorreo = 1, @Tipo = 'Seguimiento', @ClaveUnica = @Clave,
                         @IdNotificacion = @IdNotif OUTPUT;
                    SET @Avisados += 1;
                    SET @J += 1;
                END;
            END;

            -- Sin destinatarios (responsable inactivo y ningún administrador activo) no se marca: se reintenta en la siguiente vuelta.
            IF @Avisados > 0
            BEGIN
                UPDATE SeguimientoCRM SET FechaAlerta = @Ahora WHERE IdSeguimiento = @IdSeg;
                SET @AlertasSeguimiento += 1;
            END;
        END TRY
        BEGIN CATCH
            IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
            SET @Errores += 1;
        END CATCH;

        SET @I += 1;
    END;

    -- ---------- 4) Alertas de baterías ----------
    DECLARE @Bat TABLE (
        Id INT IDENTITY (1, 1) PRIMARY KEY, IdRecordatorio INT, IdVendedor INT, VendedorActivo BIT, Vendedor VARCHAR(150),
        Titulo NVARCHAR(200), Mensaje NVARCHAR(MAX), Clave NVARCHAR(150)
    );

    BEGIN TRY
        INSERT @Bat (IdRecordatorio, IdVendedor, VendedorActivo, Vendedor, Titulo, Mensaje, Clave)
        SELECT r.IdRecordatorio, r.IdVendedor, v.Activo, v.Nombre,
               N'Recordatorio de batería: ' + c.Empresa,
               N'Cliente: ' + c.Empresa
                   + N'. Contacto: ' + ISNULL(ISNULL(ct.Nombre, pr.Nombre), N'Sin contacto registrado')
                   + N'. Batería: ' + r.ModeloBateria
                   + N'. Cantidad: ' + CONVERT(NVARCHAR(10), r.Cantidad)
                   + N'. Fecha de compra: ' + CONVERT(NVARCHAR(10), r.FechaCompra, 103)
                   + N'. Factura: ' + ISNULL(r.NumeroFactura, N'Sin factura')
                   + N'. Se cumplieron ' + CONVERT(NVARCHAR(10), DATEDIFF(MONTH, r.FechaCompra, r.FechaRecordatorio))
                   + N' meses desde la compra: contacte al cliente para ofrecer el reemplazo.',
               N'BAT-' + CONVERT(NVARCHAR(10), r.IdRecordatorio)
        FROM RecordatorioBateria r
        INNER JOIN Cliente c ON c.IdCliente = r.IdCliente
        INNER JOIN Usuario v ON v.IdUsuario = r.IdVendedor
        LEFT JOIN ContactoEmpresa ct ON ct.IdContactoEmpresa = r.IdContactoEmpresa
        OUTER APPLY (SELECT TOP (1) x.Nombre FROM ContactoEmpresa x
                     WHERE x.IdCliente = r.IdCliente AND x.EsPrincipal = 1 AND x.Activo = 1) pr
        WHERE r.Estado = 'Pendiente' AND r.FechaRecordatorio <= @Hoy AND c.Activo = 1
        ORDER BY r.FechaRecordatorio, r.IdRecordatorio;
    END TRY
    BEGIN CATCH
        SET @Errores += 1;
    END CATCH;

    SET @I = 1;
    SET @N = (SELECT COUNT(*) FROM @Bat);
    DECLARE @IdRec INT;

    WHILE @I <= @N
    BEGIN
        SELECT @IdRec = IdRecordatorio, @IdResp = IdVendedor, @RespActivo = VendedorActivo, @NombreResp = Vendedor,
               @Titulo = Titulo, @Mensaje = Mensaje, @Clave = Clave
        FROM @Bat WHERE Id = @I;

        BEGIN TRY
            SET @Avisados = 0;
            IF @RespActivo = 1
            BEGIN
                EXEC dbo.sp_Notificacion_Registrar @IdUsuario = @IdResp, @IdModulo = @IdModulo, @Titulo = @Titulo, @Mensaje = @Mensaje,
                     @Entidad = N'RecordatorioBateria', @IdEntidad = @IdRec, @EnviarCorreo = 1, @Tipo = 'Bateria', @ClaveUnica = @Clave,
                     @IdNotificacion = @IdNotif OUTPUT;
                SET @Avisados = 1;
            END
            ELSE
            BEGIN
                SET @Mensaje = @Mensaje + N' El vendedor responsable (' + @NombreResp + N') ya no está activo: reasigne el cliente.';
                SET @J = 1;
                WHILE @J <= @TotalAdmins
                BEGIN
                    SELECT @Destino = IdUsuario FROM @Admins WHERE Id = @J;
                    EXEC dbo.sp_Notificacion_Registrar @IdUsuario = @Destino, @IdModulo = @IdModulo, @Titulo = @Titulo, @Mensaje = @Mensaje,
                         @Entidad = N'RecordatorioBateria', @IdEntidad = @IdRec, @EnviarCorreo = 1, @Tipo = 'Bateria', @ClaveUnica = @Clave,
                         @IdNotificacion = @IdNotif OUTPUT;
                    SET @Avisados += 1;
                    SET @J += 1;
                END;
            END;

            IF @Avisados > 0
            BEGIN
                UPDATE RecordatorioBateria SET Estado = 'Notificado', FechaNotificacion = SYSUTCDATETIME()
                WHERE IdRecordatorio = @IdRec AND Estado = 'Pendiente';
                IF @@ROWCOUNT = 1 SET @BateriasNotificadas += 1;
            END;
        END TRY
        BEGIN CATCH
            IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
            SET @Errores += 1;
        END CATCH;

        SET @I += 1;
    END;

    IF @MostrarResultado = 1
        SELECT @SeguimientosAtrasados AS SeguimientosAtrasados, @AlertasSeguimiento AS AlertasSeguimiento, @SeriesExtendidas AS SeriesExtendidas,
               @OcurrenciasCreadas AS OcurrenciasCreadas, @BateriasNotificadas AS BateriasNotificadas, @Errores AS Errores;
END
