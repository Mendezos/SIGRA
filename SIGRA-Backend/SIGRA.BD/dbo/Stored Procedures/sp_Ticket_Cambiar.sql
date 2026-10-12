CREATE PROCEDURE [dbo].[sp_Ticket_Cambiar]
    @IdTicket INT, @IdUsuario INT, @Operacion VARCHAR(30), @Version VARBINARY(8),
    @Datos NVARCHAR(MAX), @Antes NVARCHAR(MAX) = NULL, @Resumen NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @Estado VARCHAR(30), @Activo BIT, @Factura BIT, @Tecnico INT, @Receptor INT,
            @Fecha DATETIME2=SYSUTCDATETIME(), @Lock INT, @Tipo NVARCHAR(50), @TipoNuevo NVARCHAR(50),
            @Trabajo NVARCHAR(MAX), @TrabajoAnterior NVARCHAR(MAX), @Resolucion NVARCHAR(50),
            @Etapa NVARCHAR(50), @Repuesto NVARCHAR(300), @Motivo NVARCHAR(500)=JSON_VALUE(@Datos,'$.motivo'),
            @NuevaFecha DATETIME2=CONVERT(DATETIME2,TRY_CONVERT(DATETIMEOFFSET,JSON_VALUE(@Datos,'$.fechaEstimada')));
    BEGIN TRY
        BEGIN TRANSACTION;
        EXEC sp_Ticket_Bloquear;
        SELECT @Estado=t.Estado,@Activo=t.Activo,@Tipo=t.TipoServicio,@Receptor=t.TecnicoReceptor,
               @Factura=g.FacturaEmitida,@Tecnico=g.IdTecnicoAsignado,@TrabajoAnterior=g.TrabajoJson
        FROM Ticket t INNER JOIN TicketGestion g WITH (UPDLOCK,HOLDLOCK) ON g.IdTicket=t.IdTicket
        WHERE t.IdTicket=@IdTicket AND g.Version=@Version;
        IF @Estado IS NULL THROW 50002, 'Otra persona actualizó la boleta. Actualizá el detalle antes de guardar.', 1;
        IF @Activo=0 OR @Estado IN ('Cerrada','Cancelada') THROW 50001, 'Esta boleta es de solo lectura.', 1;
        IF @Factura=1 AND @Operacion<>'Cerrar' THROW 50001, 'La boleta tiene una factura emitida y no admite modificaciones.', 1;

        IF @Operacion='Recibir'
        BEGIN
            IF @Receptor IS NOT NULL THROW 50001, 'La recepción física ya fue confirmada y no se puede modificar.', 1;
            UPDATE Ticket SET TecnicoReceptor=@IdUsuario WHERE IdTicket=@IdTicket;
            UPDATE TicketGestion SET FechaRecepcionFisica=@Fecha,FechaEstimada=@NuevaFecha WHERE IdTicket=@IdTicket;
        END
        ELSE IF @Operacion='Asignar'
        BEGIN
            DECLARE @NuevoTecnico INT=TRY_CONVERT(INT,JSON_VALUE(@Datos,'$.idTecnico')),
                    @Confirmar BIT=CASE WHEN JSON_VALUE(@Datos,'$.confirmarSobrecarga')='true' THEN 1 ELSE 0 END;
            IF @NuevaFecha IS NOT NULL UPDATE TicketGestion SET FechaEstimada=@NuevaFecha WHERE IdTicket=@IdTicket;
            EXEC sp_Ticket_AsignarInterno @IdTicket,@IdUsuario,@NuevoTecnico,0,@Confirmar;
        END
        ELSE IF @Operacion='Iniciar'
        BEGIN
            IF @Estado<>'Asignada' THROW 50001, 'Solo se puede iniciar una boleta asignada.', 1;
            IF @Tecnico<>@IdUsuario OR @Tecnico IS NULL THROW 50001, 'Solo el técnico asignado puede iniciar el trabajo.', 1;
            IF @Receptor IS NULL THROW 50001, 'Primero debe confirmarse la recepción física de los equipos.', 1;
            UPDATE Ticket SET Estado='En proceso' WHERE IdTicket=@IdTicket;
            UPDATE TicketGestion SET FechaInicio=COALESCE(FechaInicio,@Fecha) WHERE IdTicket=@IdTicket;
        END
        ELSE IF @Operacion IN ('Cancelar','Inactivar')
        BEGIN
            IF NULLIF(LTRIM(RTRIM(@Motivo)),N'') IS NULL THROW 50001, 'Debe indicar el motivo.', 1;
            IF @Operacion='Cancelar' AND @Estado NOT IN ('Creada','Asignada') THROW 50001, 'Solo se puede cancelar antes de iniciar el servicio.', 1;
            IF @Operacion='Cancelar' UPDATE Ticket SET Estado='Cancelada' WHERE IdTicket=@IdTicket;
            ELSE UPDATE Ticket SET Activo=0 WHERE IdTicket=@IdTicket;
            UPDATE TicketGestion SET Motivo=@Motivo WHERE IdTicket=@IdTicket;
            UPDATE TicketEsperaRepuesto SET Fin=@Fecha WHERE IdTicket=@IdTicket AND Fin IS NULL;
            EXEC sp_Ticket_Inventario @IdTicket,@IdUsuario,'Compensar';
        END
        ELSE IF @Operacion='Editar'
        BEGIN
            SET @TipoNuevo=JSON_VALUE(@Datos,'$.tipoServicio');
            IF @TipoNuevo<>@Tipo AND (@Estado<>'Creada' OR @Tecnico IS NOT NULL)
                THROW 50001, 'El tipo de servicio solo puede corregirse en una boleta creada sin asignar.', 1;
            DECLARE @Cliente INT=TRY_CONVERT(INT,JSON_VALUE(@Datos,'$.idCliente')),
                    @Empresa NVARCHAR(150)=JSON_VALUE(@Datos,'$.empresa'), @Contacto NVARCHAR(150)=JSON_VALUE(@Datos,'$.contacto'),
                    @Telefono NVARCHAR(20)=JSON_VALUE(@Datos,'$.telefono'), @Correo NVARCHAR(150)=JSON_VALUE(@Datos,'$.correo');
            IF @Cliente IS NULL SELECT TOP (1) @Cliente=IdCliente FROM Cliente WITH (UPDLOCK,HOLDLOCK)
                WHERE LTRIM(RTRIM(Empresa)) COLLATE Latin1_General_100_CI_AI=LTRIM(RTRIM(@Empresa)) ORDER BY IdCliente;
            IF @Cliente IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Cliente WHERE IdCliente=@Cliente AND Activo=1)
                THROW 50001, 'El cliente seleccionado está inactivo o no existe.', 1;
            IF @Cliente IS NULL
            BEGIN
                INSERT Cliente (Empresa,Contacto,Telefono,Correo) VALUES (@Empresa,@Contacto,@Telefono,@Correo);
                SET @Cliente=SCOPE_IDENTITY();
            END;
            SELECT @Empresa=Empresa FROM Cliente WHERE IdCliente=@Cliente;
            IF JSON_VALUE(@Datos,'$.confirmarAlquilerOtroCliente')<>'true' AND EXISTS (
                SELECT 1 FROM OPENJSON(@Datos,'$.equipos') j INNER JOIN Equipo e ON e.NumeroSerie=JSON_VALUE(j.value,'$.numeroSerie')
                INNER JOIN ContratoEquipo ce ON ce.IdEquipo=e.IdEquipo AND ce.FechaDevolucion IS NULL
                INNER JOIN Contrato c ON c.IdContrato=ce.IdContrato AND c.Estado IN ('Activo','Renovado','Vencido') WHERE c.IdCliente<>@Cliente)
                THROW 50004, 'Un equipo está alquilado a otro cliente. Confirmá si deseás continuar.', 1;
            UPDATE Ticket SET IdCliente=@Cliente,TipoServicio=@TipoNuevo WHERE IdTicket=@IdTicket;
            UPDATE TicketGestion SET Empresa=@Empresa,Contacto=@Contacto,Telefono=@Telefono,Correo=@Correo,Cargo=JSON_VALUE(@Datos,'$.cargo') WHERE IdTicket=@IdTicket;
            MERGE TicketEquipo AS destino
            USING (
                SELECT e.IdEquipo,JSON_VALUE(j.value,'$.marca') AS Marca,JSON_VALUE(j.value,'$.modelo') AS Modelo,
                       JSON_VALUE(j.value,'$.tipo') AS Tipo,JSON_VALUE(j.value,'$.especialidad') AS Especialidad,
                       JSON_VALUE(j.value,'$.numeroSerie') AS NumeroSerie,COALESCE(JSON_QUERY(j.value,'$.accesorios'),N'[]') AS Accesorios,
                       (SELECT Texto FROM OPENJSON(j.value) WITH(Texto NVARCHAR(MAX) '$.problema')) AS Problema,contrato.IdContrato,
                       CASE WHEN contrato.IdCliente=@Cliente AND contrato.CubreReparaciones=1 AND contrato.Estado IN ('Activo','Renovado')
                              AND contrato.FechaInicio<=CONVERT(DATE,DATEADD(HOUR,-6,@Fecha)) AND contrato.FechaVencimiento>=CONVERT(DATE,DATEADD(HOUR,-6,@Fecha)) THEN 1 ELSE 0 END AS Cubierto
                FROM OPENJSON(@Datos,'$.equipos') j LEFT JOIN Equipo e ON e.NumeroSerie=JSON_VALUE(j.value,'$.numeroSerie')
                OUTER APPLY (SELECT TOP (1) c.IdContrato,c.IdCliente,c.CubreReparaciones,c.Estado,c.FechaInicio,c.FechaVencimiento
                             FROM ContratoEquipo ce INNER JOIN Contrato c ON c.IdContrato=ce.IdContrato
                             WHERE ce.IdEquipo=e.IdEquipo AND ce.FechaDevolucion IS NULL AND c.Estado IN ('Activo','Renovado','Vencido') ORDER BY c.IdContrato DESC) contrato
            ) AS origen ON destino.IdTicket=@IdTicket AND destino.NumeroSerie=origen.NumeroSerie
            WHEN MATCHED THEN UPDATE SET IdEquipo=origen.IdEquipo,Marca=origen.Marca,Modelo=origen.Modelo,Tipo=origen.Tipo,
                                         Especialidad=origen.Especialidad,Accesorios=origen.Accesorios,Problema=origen.Problema,IdContrato=origen.IdContrato,CubiertoPorContrato=origen.Cubierto
            WHEN NOT MATCHED BY TARGET THEN INSERT (IdTicket,IdEquipo,Marca,Modelo,Tipo,Especialidad,NumeroSerie,Accesorios,Problema,IdContrato,CubiertoPorContrato)
                VALUES (@IdTicket,origen.IdEquipo,origen.Marca,origen.Modelo,origen.Tipo,origen.Especialidad,origen.NumeroSerie,origen.Accesorios,origen.Problema,origen.IdContrato,origen.Cubierto)
            WHEN NOT MATCHED BY SOURCE AND destino.IdTicket=@IdTicket THEN DELETE;
            IF @TipoNuevo IN (N'Reparación',N'Revisión diagnóstica') AND NOT EXISTS (SELECT 1 FROM Reparacion WHERE IdTicket=@IdTicket)
            BEGIN
                INSERT Reparacion (IdTicket,TecnicoResponsable) VALUES (@IdTicket,NULL);
                UPDATE TicketGestion SET EstadoAsignacion=N'Disponible' WHERE IdTicket=@IdTicket;
                EXEC sp_Ticket_AsignarInterno @IdTicket,@IdUsuario,NULL,1;
            END
            ELSE IF @TipoNuevo NOT IN (N'Reparación',N'Revisión diagnóstica') AND @Estado='Creada' DELETE Reparacion WHERE IdTicket=@IdTicket;
            EXEC sp_Ticket_Inventario @IdTicket,@IdUsuario,'Sincronizar';
        END
        ELSE IF @Operacion='Derivar'
        BEGIN
            IF EXISTS (SELECT 1 FROM Reparacion WHERE IdTicket=@IdTicket) THROW 50001, 'La boleta ya tiene una reparación asociada.', 1;
            IF EXISTS (SELECT 1 FROM TicketEquipo WHERE IdTicket=@IdTicket AND LEN(LTRIM(RTRIM(Problema)))<10)
                THROW 50001, 'Completá la descripción de la falla con al menos 10 caracteres antes de generar la reparación.', 1;
            INSERT Reparacion (IdTicket,TecnicoResponsable) VALUES (@IdTicket,NULL);
            UPDATE TicketGestion SET EstadoAsignacion=N'Disponible' WHERE IdTicket=@IdTicket;
            EXEC sp_Ticket_AsignarInterno @IdTicket,@IdUsuario,NULL,1;
            EXEC sp_Ticket_Inventario @IdTicket,@IdUsuario,'Abrir';
        END
        ELSE IF @Operacion IN ('Borrador','Cerrar','Factura')
        BEGIN
            IF @Estado<>'En proceso' OR @Tecnico<>@IdUsuario OR @Tecnico IS NULL
                THROW 50001, 'Solo el técnico responsable puede registrar el trabajo de una boleta en proceso.', 1;
            SET @Trabajo=CASE WHEN @Factura=1 THEN @TrabajoAnterior ELSE JSON_QUERY(@Datos,'$.trabajo') END;
            IF @Trabajo IS NULL OR ISJSON(@Trabajo)<>1 THROW 50001, 'Los datos técnicos no son válidos.', 1;
            SET @Etapa=JSON_VALUE(@Trabajo,'$.etapa'); SET @Repuesto=JSON_VALUE(@Trabajo,'$.repuesto');
            IF @Etapa=N'En espera de repuesto' AND NULLIF(LTRIM(RTRIM(@Repuesto)),N'') IS NULL THROW 50001, 'Debe indicar el repuesto pendiente.', 1;
            IF EXISTS (SELECT 1 FROM TicketEsperaRepuesto WHERE IdTicket=@IdTicket AND Fin IS NULL
                       AND (@Etapa<>N'En espera de repuesto' OR Repuesto<>@Repuesto OR @Operacion='Cerrar'))
                UPDATE TicketEsperaRepuesto SET Fin=@Fecha WHERE IdTicket=@IdTicket AND Fin IS NULL;
            IF @Etapa=N'En espera de repuesto' AND @Operacion<>'Cerrar' AND NOT EXISTS (SELECT 1 FROM TicketEsperaRepuesto WHERE IdTicket=@IdTicket AND Fin IS NULL)
                INSERT TicketEsperaRepuesto (IdTicket,Repuesto,Inicio) VALUES (@IdTicket,@Repuesto,@Fecha);
            IF @Operacion IN ('Cerrar','Factura')
            BEGIN
                SET @Resolucion=JSON_VALUE(@Trabajo,'$.resolucion');
                IF @Resolucion=N'No reparado' AND LEN(LTRIM(RTRIM(COALESCE((SELECT Texto FROM OPENJSON(@Trabajo) WITH(Texto NVARCHAR(MAX) '$.justificacionTecnica')),N''))))<15
                    THROW 50001, 'La justificación técnica debe tener al menos 15 caracteres.', 1;
                IF @Resolucion=N'Garantía' AND (NULLIF(JSON_VALUE(@Trabajo,'$.proveedor'),N'') IS NULL OR NULLIF(JSON_VALUE(@Trabajo,'$.casoProveedor'),N'') IS NULL)
                    THROW 50001, 'Debe indicar el proveedor y el número de caso de garantía.', 1;
                IF @Resolucion<>N'Garantía' AND (JSON_VALUE(@Trabajo,'$.tieneCobro')='true'
                    OR (@Resolucion=N'Reparado' AND EXISTS (SELECT 1 FROM Reparacion WHERE IdTicket=@IdTicket)
                        AND EXISTS (SELECT 1 FROM TicketEquipo te WHERE te.IdTicket=@IdTicket
                                    AND NOT EXISTS (SELECT 1 FROM Contrato c WHERE c.IdContrato=te.IdContrato AND c.IdCliente=(SELECT IdCliente FROM Ticket WHERE IdTicket=@IdTicket)
                                         AND c.CubreReparaciones=1 AND c.Estado IN ('Activo','Renovado') AND c.FechaInicio<=CONVERT(DATE,DATEADD(HOUR,-6,@Fecha)) AND c.FechaVencimiento>=CONVERT(DATE,DATEADD(HOUR,-6,@Fecha))))))
                BEGIN
                    IF NULLIF(JSON_VALUE(@Trabajo,'$.numeroFactura'),N'') IS NULL THROW 50001, 'Debe indicar el número de factura cuando aplica cobro.', 1;
                    IF COALESCE(TRY_CONVERT(DECIMAL(12,2),JSON_VALUE(@Trabajo,'$.monto')),0)<=0 THROW 50001, 'El monto debe ser un valor numérico mayor a cero', 1;
                END;
            END;
            UPDATE TicketGestion SET TrabajoJson=@Trabajo,FacturaEmitida=CASE WHEN @Operacion='Factura' THEN 1 ELSE FacturaEmitida END WHERE IdTicket=@IdTicket;
            UPDATE Reparacion SET Hallazgos=(SELECT Texto FROM OPENJSON(@Trabajo) WITH(Texto NVARCHAR(MAX) '$.hallazgos')),TrabajoRealizado=(SELECT Texto FROM OPENJSON(@Trabajo) WITH(Texto NVARCHAR(MAX) '$.acciones')),
                Resolucion=JSON_VALUE(@Trabajo,'$.resolucion'),NumeroFactura=JSON_VALUE(@Trabajo,'$.numeroFactura'),Monto=TRY_CONVERT(DECIMAL(12,2),JSON_VALUE(@Trabajo,'$.monto')),
                JustificacionTecnica=(SELECT Texto FROM OPENJSON(@Trabajo) WITH(Texto NVARCHAR(MAX) '$.justificacionTecnica')),CasoProveedor=JSON_VALUE(@Trabajo,'$.casoProveedor') WHERE IdTicket=@IdTicket;
            IF @Operacion='Cerrar'
            BEGIN
                UPDATE Ticket SET Estado='Cerrada' WHERE IdTicket=@IdTicket;
                UPDATE TicketGestion SET FechaCierre=@Fecha,IdTecnicoCierre=@IdUsuario,
                    FacturaEmitida=CASE WHEN NULLIF(JSON_VALUE(@Trabajo,'$.numeroFactura'),N'') IS NOT NULL THEN 1 ELSE FacturaEmitida END WHERE IdTicket=@IdTicket;
                UPDATE TicketEsperaRepuesto SET Fin=@Fecha WHERE IdTicket=@IdTicket AND Fin IS NULL;
                IF @Resolucion=N'Garantía'
                    INSERT GarantiaTicket (IdTicket,IdTicketEquipo,Proveedor,CasoProveedor,Fecha)
                    SELECT @IdTicket,IdTicketEquipo,JSON_VALUE(@Trabajo,'$.proveedor'),JSON_VALUE(@Trabajo,'$.casoProveedor'),@Fecha FROM TicketEquipo WHERE IdTicket=@IdTicket;
                EXEC sp_Ticket_Inventario @IdTicket,@IdUsuario,'Cerrar',@Resolucion;
            END;
        END
        ELSE THROW 50001, 'La operación solicitada no es válida.', 1;

        DECLARE @EstadoNuevo VARCHAR(30)=(SELECT Estado FROM Ticket WHERE IdTicket=@IdTicket);
        IF @EstadoNuevo<>@Estado AND NOT (@Operacion IN ('Asignar','Editar') AND @EstadoNuevo='Asignada')
        BEGIN
            UPDATE TicketEstadoHistorial SET FechaFin=@Fecha WHERE IdTicket=@IdTicket AND FechaFin IS NULL;
            INSERT TicketEstadoHistorial (IdTicket,IdUsuario,Estado,FechaInicio) VALUES (@IdTicket,@IdUsuario,@EstadoNuevo,@Fecha);
        END;
        IF @Operacion IN ('Editar','Borrador')
            INSERT TicketEdicion (IdTicket,IdUsuario,Resumen,Fecha) VALUES (@IdTicket,@IdUsuario,COALESCE(@Resumen,N'Datos actualizados'),@Fecha);
        DECLARE @Despues NVARCHAR(MAX)=(SELECT Empresa AS empresa,Contacto AS contacto,Telefono AS telefono,Correo AS correo,Cargo AS cargo,
                 TipoServicio AS tipoServicio,Estado AS estado,Activo AS activo,Tecnico AS tecnico,RecibidoPor AS recibidoPor,
                 FechaRecepcionFisica AS fechaRecepcionFisica,FechaInicio AS fechaInicio,FechaCierre AS fechaCierre,FechaEstimada AS fechaEstimada,
                 FacturaEmitida AS facturaEmitida,Motivo AS motivo,JSON_QUERY(TrabajoJson) AS trabajo,
                 JSON_QUERY((SELECT Marca AS marca,Modelo AS modelo,NumeroSerie AS numeroSerie,Tipo AS tipo,
                                     JSON_QUERY(Accesorios) AS accesorios,Problema AS problema FROM TicketEquipo WHERE IdTicket=@IdTicket ORDER BY IdTicketEquipo FOR JSON PATH)) AS equipos
                 FROM vw_TicketDetalle WHERE IdTicket=@IdTicket FOR JSON PATH,WITHOUT_ARRAY_WRAPPER), @Auditoria NVARCHAR(MAX);
        SET @Auditoria=(SELECT JSON_QUERY(@Antes) AS antes,JSON_QUERY(@Despues) AS despues FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
        IF @Operacion<>'Asignar'
            INSERT Auditoria (IdUsuario,Modulo,Entidad,IdEntidad,Accion,Detalle,Fecha)
            VALUES (@IdUsuario,'GTST','Ticket',@IdTicket,CONCAT('TICKET_',UPPER(@Operacion)),@Auditoria,@Fecha);
        UPDATE TicketGestion SET Motivo=Motivo WHERE IdTicket=@IdTicket;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
