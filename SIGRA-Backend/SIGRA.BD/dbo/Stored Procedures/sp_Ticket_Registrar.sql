CREATE PROCEDURE [dbo].[sp_Ticket_Registrar] @Datos NVARCHAR(MAX), @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @Solicitud UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(@Datos,'$.solicitud')),
            @IdCliente INT=TRY_CONVERT(INT,JSON_VALUE(@Datos,'$.idCliente')),
            @Empresa NVARCHAR(150)=JSON_VALUE(@Datos,'$.empresa'), @Contacto NVARCHAR(150)=JSON_VALUE(@Datos,'$.contacto'),
            @Telefono NVARCHAR(20)=JSON_VALUE(@Datos,'$.telefono'), @Cargo NVARCHAR(100)=JSON_VALUE(@Datos,'$.cargo'),
            @Correo NVARCHAR(150)=JSON_VALUE(@Datos,'$.correo'), @Tipo NVARCHAR(50)=JSON_VALUE(@Datos,'$.tipoServicio'),
            @IdTicket INT, @Numero BIGINT, @Codigo VARCHAR(32), @Fecha DATETIME=GETUTCDATE(), @Lock INT,
            @Confirmar BIT=CASE WHEN JSON_VALUE(@Datos,'$.confirmarAlquilerOtroCliente')='true' THEN 1 ELSE 0 END;
    IF @Solicitud IS NULL OR @Solicitud='00000000-0000-0000-0000-000000000000' THROW 50001, 'La solicitud de registro no es válida.', 1;
    BEGIN TRY
        BEGIN TRANSACTION;
        EXEC sp_Ticket_Bloquear;
        SELECT @IdTicket=IdTicket FROM TicketGestion WHERE Solicitud=@Solicitud;
        IF @IdTicket IS NOT NULL
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM TicketGestion WHERE IdTicket=@IdTicket AND IdUsuarioRegistro=@IdUsuario)
                THROW 50001, 'La solicitud de registro pertenece a otro usuario.', 1;
            COMMIT; SELECT @IdTicket; RETURN;
        END;
        IF @IdCliente IS NULL
            SELECT TOP (1) @IdCliente=IdCliente FROM Cliente WITH (UPDLOCK,HOLDLOCK)
            WHERE LTRIM(RTRIM(Empresa)) COLLATE Latin1_General_100_CI_AI=LTRIM(RTRIM(@Empresa)) ORDER BY IdCliente;
        IF @IdCliente IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Cliente WHERE IdCliente=@IdCliente AND Activo=1)
            THROW 50001, 'El cliente seleccionado está inactivo o no existe.', 1;
        IF @IdCliente IS NULL
        BEGIN
            INSERT Cliente (Empresa,Contacto,Correo,Telefono) VALUES (@Empresa,@Contacto,@Correo,@Telefono);
            SET @IdCliente=SCOPE_IDENTITY();
        END;
        SELECT @Empresa=Empresa FROM Cliente WHERE IdCliente=@IdCliente;
        IF @Confirmar=0 AND EXISTS (
            SELECT 1 FROM OPENJSON(@Datos,'$.equipos') j
            INNER JOIN Equipo e WITH (UPDLOCK,HOLDLOCK) ON e.NumeroSerie=JSON_VALUE(j.value,'$.numeroSerie')
            INNER JOIN ContratoEquipo ce ON ce.IdEquipo=e.IdEquipo AND ce.FechaDevolucion IS NULL
            INNER JOIN Contrato c ON c.IdContrato=ce.IdContrato AND c.Estado IN ('Activo','Renovado','Vencido')
            WHERE c.IdCliente<>@IdCliente)
            THROW 50004, 'Uno de los equipos está alquilado a otro cliente. Confirmá si deseás continuar con el registro.', 1;
        EXEC sp_Correlativo_Siguiente 'GTST',@Numero OUTPUT;
        SET @Codigo=LOWER(REPLACE(CONVERT(VARCHAR(36),NEWID()),'-',''));
        DECLARE @Problemas VARCHAR(MAX);
        SELECT @Problemas=STRING_AGG(CONVERT(NVARCHAR(MAX),CONCAT(JSON_VALUE(j.value,'$.numeroSerie'),': ',problema.Texto)),CHAR(10)) FROM OPENJSON(@Datos,'$.equipos') j OUTER APPLY OPENJSON(j.value) WITH(Texto NVARCHAR(MAX) '$.problema') problema;
        INSERT Ticket (IdCliente,TecnicoReceptor,CodigoSeguimiento,TipoServicio,Estado,FechaRecepcion,DescripcionProblema)
        VALUES (@IdCliente,NULL,@Codigo,@Tipo,'Creada',@Fecha,@Problemas);
        SET @IdTicket=SCOPE_IDENTITY();
        INSERT TicketGestion (IdTicket,NumeroBoleta,Solicitud,Empresa,Contacto,Telefono,Correo,Cargo,IdUsuarioRegistro,EstadoAsignacion)
        VALUES (@IdTicket,@Numero,@Solicitud,@Empresa,@Contacto,@Telefono,@Correo,@Cargo,@IdUsuario,N'Disponible');
        INSERT TicketEquipo (IdTicket,IdEquipo,Marca,Modelo,Tipo,Especialidad,NumeroSerie,Accesorios,Problema,IdContrato,CubiertoPorContrato)
        SELECT @IdTicket,e.IdEquipo,JSON_VALUE(j.value,'$.marca'),JSON_VALUE(j.value,'$.modelo'),JSON_VALUE(j.value,'$.tipo'),JSON_VALUE(j.value,'$.especialidad'),
               JSON_VALUE(j.value,'$.numeroSerie'),COALESCE(JSON_QUERY(j.value,'$.accesorios'),N'[]'),(SELECT Texto FROM OPENJSON(j.value) WITH(Texto NVARCHAR(MAX) '$.problema')),contrato.IdContrato,
               CASE WHEN contrato.IdCliente=@IdCliente AND contrato.CubreReparaciones=1 AND contrato.Estado IN ('Activo','Renovado')
                          AND contrato.FechaInicio<=CONVERT(DATE,DATEADD(HOUR,-6,@Fecha)) AND contrato.FechaVencimiento>=CONVERT(DATE,DATEADD(HOUR,-6,@Fecha)) THEN 1 ELSE 0 END
        FROM OPENJSON(@Datos,'$.equipos') j LEFT JOIN Equipo e ON e.NumeroSerie=JSON_VALUE(j.value,'$.numeroSerie')
        OUTER APPLY (SELECT TOP (1) c.IdContrato,c.IdCliente,c.CubreReparaciones,c.Estado,c.FechaInicio,c.FechaVencimiento
                     FROM ContratoEquipo ce INNER JOIN Contrato c ON c.IdContrato=ce.IdContrato
                     WHERE ce.IdEquipo=e.IdEquipo AND ce.FechaDevolucion IS NULL AND c.Estado IN ('Activo','Renovado','Vencido') ORDER BY c.IdContrato DESC) contrato;
        INSERT TicketEstadoHistorial (IdTicket,IdUsuario,Estado,FechaInicio) VALUES (@IdTicket,@IdUsuario,'Creada',@Fecha);
        IF @Tipo IN (N'Reparación',N'Revisión diagnóstica')
            INSERT Reparacion (IdTicket,TecnicoResponsable) VALUES (@IdTicket,NULL);
        DECLARE @Comprobante NVARCHAR(MAX)=(SELECT @Numero AS numeroBoleta,@Codigo AS codigoSeguimiento,@Empresa AS empresa,@Contacto AS contacto,
            @Telefono AS telefono,@Correo AS correo,@Cargo AS cargo,@Tipo AS tipoServicio,TODATETIMEOFFSET(@Fecha,'+00:00') AS fechaRecepcion,
            (SELECT Nombre FROM Usuario WHERE IdUsuario=@IdUsuario) AS registradoPor,
            JSON_QUERY((SELECT Marca AS marca,Modelo AS modelo,Tipo AS tipo,NumeroSerie AS numeroSerie,
                               JSON_QUERY(Accesorios) AS accesorios,Problema AS problema FROM TicketEquipo WHERE IdTicket=@IdTicket ORDER BY IdTicketEquipo FOR JSON PATH)) AS equipos
            FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
        UPDATE TicketGestion SET ComprobanteOriginal=@Comprobante WHERE IdTicket=@IdTicket;
        EXEC sp_Ticket_Inventario @IdTicket,@IdUsuario,'Abrir';
        DECLARE @Despues NVARCHAR(MAX)=(SELECT NumeroBoleta AS numeroBoleta,Empresa AS empresa,Contacto AS contacto,
                 Telefono AS telefono,Correo AS correo,Cargo AS cargo,TipoServicio AS tipoServicio,Estado AS estado,Tecnico AS tecnico,RegistradoPor AS registradoPor,
                 JSON_QUERY(JSON_QUERY(@Comprobante,'$.equipos')) AS equipos
                 FROM vw_TicketDetalle WHERE IdTicket=@IdTicket FOR JSON PATH,WITHOUT_ARRAY_WRAPPER), @Auditoria NVARCHAR(MAX);
        SET @Auditoria=(SELECT JSON_QUERY(@Despues) AS despues FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
        INSERT Auditoria (IdUsuario,Modulo,Entidad,IdEntidad,Accion,Detalle) VALUES (@IdUsuario,'GTST','Ticket',@IdTicket,'TICKET_CREADO',@Auditoria);
        IF @Tipo IN (N'Reparación',N'Revisión diagnóstica') EXEC sp_Ticket_AsignarInterno @IdTicket,@IdUsuario,NULL,1;
        COMMIT TRANSACTION;
        SELECT @IdTicket;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
