CREATE PROCEDURE [dbo].[sp_Ticket_Catalogos]
    @Operacion VARCHAR(30), @IdUsuario INT = NULL, @Texto NVARCHAR(200) = NULL, @Datos NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @Operacion = 'Acceso'
    BEGIN
        SELECT u.IdUsuario, u.Nombre, u.Correo, r.Nombre AS Rol,
               CAST(CASE WHEN u.IdCliente IS NULL THEN 1 ELSE 0 END AS BIT) AS Interno,
               COALESCE(rp.Lectura,0) AS Lectura, COALESCE(rp.Escritura,0) AS Escritura,
               COALESCE(rp.Edicion,0) AS Edicion, COALESCE(rp.Eliminacion,0) AS Eliminacion
        FROM Usuario u INNER JOIN Rol r ON r.IdRol = u.IdRol AND r.Activo = 1
        LEFT JOIN Permiso p ON p.IdModulo = 2
        LEFT JOIN RolPermiso rp ON rp.IdRol = r.IdRol AND rp.IdPermiso = p.IdPermiso
        WHERE u.IdUsuario = @IdUsuario AND u.Activo = 1;
    END
    ELSE IF @Operacion = 'Usuarios'
        SELECT IdUsuario,Nombre FROM Usuario WHERE IdCliente IS NULL ORDER BY Nombre,IdUsuario;
    ELSE IF @Operacion = 'Clientes'
        SELECT IdCliente, Empresa, Contacto, Correo, Telefono FROM Cliente
        WHERE Activo = 1 AND (NULLIF(@Texto,'') IS NULL OR Empresa LIKE '%' + @Texto + '%' OR Contacto LIKE '%' + @Texto + '%')
        ORDER BY Empresa, IdCliente;
    ELSE IF @Operacion = 'Tecnicos'
    BEGIN
        SELECT u.IdUsuario, u.Nombre, u.Correo,
               (SELECT COUNT(*) FROM TicketGestion g INNER JOIN Ticket t ON t.IdTicket = g.IdTicket
                WHERE g.IdTecnicoAsignado = u.IdUsuario AND t.Activo = 1 AND t.Estado = 'Asignada') AS Asignadas,
               (SELECT COUNT(*) FROM TicketGestion g INNER JOIN Ticket t ON t.IdTicket = g.IdTicket
                WHERE g.IdTecnicoAsignado = u.IdUsuario AND t.Activo = 1 AND t.Estado = 'En proceso') AS EnProceso,
               TODATETIMEOFFSET((SELECT MAX(a.Fecha) FROM TicketAsignacion a WHERE a.IdTecnico = u.IdUsuario), '+00:00') AS UltimaAsignacion
        FROM Usuario u INNER JOIN Rol r ON r.IdRol = u.IdRol
        WHERE u.Activo = 1 AND r.Activo = 1 AND u.IdCliente IS NULL AND r.Nombre COLLATE Latin1_General_100_CI_AI = 'Tecnico'
        ORDER BY (SELECT COUNT(*) FROM TicketGestion g INNER JOIN Ticket t ON t.IdTicket = g.IdTicket
                  WHERE g.IdTecnicoAsignado = u.IdUsuario AND t.Activo = 1 AND t.Estado IN ('Asignada','En proceso')) DESC, u.Nombre;
        SELECT IdUsuario, Especialidad FROM UsuarioEspecialidad;
    END
    ELSE IF @Operacion = 'Configuracion'
        SELECT COALESCE((SELECT CargaMaxima FROM ConfiguracionTickets WHERE Id = 1),5) AS CargaMaxima,
               COALESCE((SELECT DiasHabilesEstimados FROM ConfiguracionTickets WHERE Id = 1),5) AS DiasHabilesEstimados;
    ELSE IF @Operacion = 'EquiposContratos'
        SELECT e.IdEquipo, e.NumeroSerie, e.Estado, contrato.IdContrato, contrato.IdCliente,
               COALESCE(contrato.CubreReparaciones,0) AS CubreReparaciones
        FROM Equipo e INNER JOIN OPENJSON(@Datos) series ON series.value = e.NumeroSerie
        OUTER APPLY (
            SELECT TOP (1) c.IdContrato, c.IdCliente,
                CAST(CASE WHEN c.CubreReparaciones = 1 AND c.Estado IN ('Activo','Renovado')
                       AND c.FechaInicio <= CONVERT(DATE,DATEADD(HOUR,-6,SYSUTCDATETIME()))
                       AND c.FechaVencimiento >= CONVERT(DATE,DATEADD(HOUR,-6,SYSUTCDATETIME())) THEN 1 ELSE 0 END AS BIT) AS CubreReparaciones
            FROM ContratoEquipo ce INNER JOIN Contrato c ON c.IdContrato = ce.IdContrato
            WHERE ce.IdEquipo = e.IdEquipo AND ce.FechaDevolucion IS NULL AND c.Estado IN ('Activo','Renovado','Vencido')
            ORDER BY c.IdContrato DESC
        ) contrato;
END;
