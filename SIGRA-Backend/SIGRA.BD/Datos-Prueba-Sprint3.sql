/*
  SIGRA - Datos de prueba del Sprint 3 (CRM, recordatorios y facturación).
  Los ejecuta Sincronizar-BD.cjs después de Script.PostDeployment.sql (se omiten con --sin-semillas).
  Es idempotente: cada fila se inserta solo si todavía no existe, así que se puede correr cuantas veces haga falta.
  Las fechas son relativas a HOY (hora de Costa Rica) para que siempre haya seguimientos de hoy, atrasados y baterías por vencer.
  Se apoya en las cuentas de prueba (kimberly.sanchez@, henry.ortiz@, admin@) y en los clientes/modelos de la semilla base;
  si no existen, no hace nada.
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;

DECLARE @Ahora DATETIME2(0) = dbo.fn_CrmAhora();
DECLARE @Hoy DATE = CONVERT(DATE, @Ahora);
DECLARE @Admin INT = (SELECT TOP 1 IdUsuario FROM Usuario WHERE Correo = 'admin@radifaxcr.com');
DECLARE @Kim INT = (SELECT TOP 1 IdUsuario FROM Usuario WHERE Correo = 'kimberly.sanchez@radifaxcr.com' AND Activo = 1);
DECLARE @Henry INT = (SELECT TOP 1 IdUsuario FROM Usuario WHERE Correo = 'henry.ortiz@radifaxcr.com' AND Activo = 1);

IF @Admin IS NULL OR @Kim IS NULL
BEGIN
    PRINT 'Datos de prueba del Sprint 3: faltan las cuentas de prueba base; no se cargan.';
    RETURN;
END

-- Si Henry Ortiz está inactivo (caso base: sirve para probar «vendedor inactivo»), todo queda con Kimberly.
SET @Henry = ISNULL(@Henry, @Kim);

DECLARE @CliHotel INT = (SELECT TOP 1 IdCliente FROM Cliente WHERE Empresa = N'Hotel Los Sueños');
DECLARE @CliBuses INT = (SELECT TOP 1 IdCliente FROM Cliente WHERE Empresa = N'Autobuses San José');
DECLARE @CliBomberos INT = (SELECT TOP 1 IdCliente FROM Cliente WHERE Empresa = N'Bomberos de Costa Rica');
DECLARE @CliMarina INT = (SELECT TOP 1 IdCliente FROM Cliente WHERE Empresa = N'Marina Pez Vela');
DECLARE @ModBateria INT = (SELECT TOP 1 IdModelo FROM ModeloEquipo WHERE Modelo = 'KNB-45');

-- Los clientes de la semilla base quedan a cargo de la vendedora (si no tenían responsable) y con su sector.
UPDATE Cliente SET IdVendedor = @Kim WHERE IdVendedor IS NULL AND Empresa IN (N'Hotel Los Sueños', N'Autobuses San José', N'Bomberos de Costa Rica', N'Marina Pez Vela');
UPDATE Cliente SET Sector = N'Turismo y hotelería' WHERE Empresa IN (N'Hotel Los Sueños', N'Marina Pez Vela') AND Sector IS NULL;
UPDATE Cliente SET Sector = N'Transporte' WHERE Empresa = N'Autobuses San José' AND Sector IS NULL;
UPDATE Cliente SET Sector = N'Seguridad' WHERE Empresa = N'Bomberos de Costa Rica' AND Sector IS NULL;

-- ===================== 1) Prospectos =====================
INSERT INTO Prospecto (Empresa, Contacto, Correo, Telefono, Estado, Sector, Direccion, TamanoFlota, Fuente, IdVendedor, FechaIngreso, IdUsuarioCrea,
                       MotivoDescarte, ObservacionDescarte, FechaDescarte)
SELECT v.Empresa, v.Contacto, v.Correo, v.Telefono, v.Estado, v.Sector, v.Direccion, v.Flota, v.Fuente, v.Vendedor, DATEADD(DAY, -v.DiasIngreso, @Hoy), @Admin,
       v.Motivo, v.Observacion, CASE WHEN v.Estado = 'Descartado' THEN DATEADD(DAY, 12 - v.DiasIngreso, @Ahora) END
FROM (VALUES
    (N'Transportes Alajuelenses S.A.', N'Roberto Campos', 'rcampos@transalajuela.example', '24430011', 'Nuevo', N'Transporte', N'Alajuela, 200 m norte de la terminal', 35, N'Referido', @Kim, 3, CAST(NULL AS NVARCHAR(100)), CAST(NULL AS NVARCHAR(500))),
    (N'Hotel Costa Esmeralda', N'Daniela Fonseca', 'compras@costaesmeralda.example', '26540022', 'Cotización enviada', N'Turismo y hotelería', N'Guanacaste, Playa Flamingo', 60, N'Sitio web', @Kim, 12, NULL, NULL),
    (N'Constructora Meridiano', N'Ing. Esteban Rojas', 'erojas@meridiano.example', '22896633', 'En negociación', N'Construcción', N'San José, Escazú', 24, N'Feria o evento', @Henry, 25, NULL, NULL),
    (N'Seguridad Atlántica', N'Luis Mena', 'operaciones@segatlantica.example', '27580044', 'Nuevo', N'Seguridad', N'Limón centro', 80, N'Llamada entrante', @Kim, 1, NULL, NULL),
    (N'Cooperativa de Taxis Heredia', N'Franklin Mora', 'coopetaxisheredia@example.com', '22600055', 'Descartado', N'Transporte', N'Heredia, Barreal', 18, N'Redes sociales', @Henry, 40, N'Precio', N'Consideró que el alquiler mensual excedía su presupuesto.'),
    (N'Agroindustrial Guanacaste', N'Silvia Ureña', 'surena@agroguanacaste.example', '26660066', 'Convertido', N'Agricultura', N'Liberia, zona industrial', 42, N'Referido', @Kim, 60, NULL, NULL)
) v(Empresa, Contacto, Correo, Telefono, Estado, Sector, Direccion, Flota, Fuente, Vendedor, DiasIngreso, Motivo, Observacion)
WHERE NOT EXISTS (SELECT 1 FROM Prospecto p WHERE p.Empresa = v.Empresa);

-- El prospecto convertido apunta a un cliente nuevo (para probar «prospecto ya convertido»).
IF NOT EXISTS (SELECT 1 FROM Cliente WHERE Empresa = N'Agroindustrial Guanacaste')
    INSERT INTO Cliente (Empresa, Contacto, Correo, Telefono, Activo, Sector, Direccion, TamanoFlota, IdVendedor)
    VALUES (N'Agroindustrial Guanacaste', N'Silvia Ureña', 'compras@agroguanacaste.example', '26660066', 1, N'Agricultura', N'Liberia, zona industrial', 42, @Kim);

UPDATE p
SET IdCliente = c.IdCliente, FechaConversion = DATEADD(DAY, -35, @Ahora)
FROM Prospecto p
INNER JOIN Cliente c ON c.Empresa = p.Empresa
WHERE p.Empresa = N'Agroindustrial Guanacaste' AND p.IdCliente IS NULL;

DECLARE @PrTrans INT = (SELECT IdProspecto FROM Prospecto WHERE Empresa = N'Transportes Alajuelenses S.A.');
DECLARE @PrCosta INT = (SELECT IdProspecto FROM Prospecto WHERE Empresa = N'Hotel Costa Esmeralda');
DECLARE @PrMerid INT = (SELECT IdProspecto FROM Prospecto WHERE Empresa = N'Constructora Meridiano');
DECLARE @PrSeg INT = (SELECT IdProspecto FROM Prospecto WHERE Empresa = N'Seguridad Atlántica');
DECLARE @PrTaxi INT = (SELECT IdProspecto FROM Prospecto WHERE Empresa = N'Cooperativa de Taxis Heredia');
DECLARE @PrAgro INT = (SELECT IdProspecto FROM Prospecto WHERE Empresa = N'Agroindustrial Guanacaste');

-- Historial de estados (solo de los prospectos que todavía no tienen historial)
INSERT INTO ProspectoEstadoHistorial (IdProspecto, EstadoAnterior, EstadoNuevo, Motivo, Observacion, IdUsuario, Fecha)
SELECT h.IdProspecto, h.Anterior, h.Nuevo, h.Motivo, h.Observacion, @Admin, DATEADD(DAY, -h.Dias, @Ahora)
FROM (VALUES
    (@PrTrans, CAST(NULL AS VARCHAR(30)), 'Nuevo', CAST(NULL AS VARCHAR(100)), N'Prospecto registrado', 3),
    (@PrCosta, NULL, 'Nuevo', NULL, N'Prospecto registrado', 12),
    (@PrCosta, 'Nuevo', 'Cotización enviada', NULL, N'Se envió la cotización por correo', 8),
    (@PrMerid, NULL, 'Nuevo', NULL, N'Prospecto registrado en la feria', 25),
    (@PrMerid, 'Nuevo', 'Cotización enviada', NULL, NULL, 20),
    (@PrMerid, 'Cotización enviada', 'En negociación', NULL, N'Pidió ajustar la cantidad de radios', 9),
    (@PrSeg, NULL, 'Nuevo', NULL, N'Prospecto registrado', 1),
    (@PrTaxi, NULL, 'Nuevo', NULL, N'Prospecto registrado', 40),
    (@PrTaxi, 'Nuevo', 'Descartado', N'Precio', N'Consideró que el alquiler mensual excedía su presupuesto.', 28),
    (@PrAgro, NULL, 'Nuevo', NULL, N'Prospecto registrado', 60),
    (@PrAgro, 'Nuevo', 'Convertido', NULL, N'Firmó su primer contrato de alquiler', 35)
) h(IdProspecto, Anterior, Nuevo, Motivo, Observacion, Dias)
WHERE h.IdProspecto IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM ProspectoEstadoHistorial x WHERE x.IdProspecto = h.IdProspecto);

-- ===================== 2) Contactos de empresa =====================
INSERT INTO ContactoEmpresa (IdProspecto, IdCliente, Nombre, Cargo, Telefono, Correo, FechaCumpleanos, PreferenciaContacto, EsPrincipal, Activo, MotivoDesactivacion, FechaDesactivacion, IdUsuarioCrea)
SELECT v.IdProspecto, v.IdCliente, v.Nombre, v.Cargo, v.Telefono, v.Correo, v.Cumple, v.Preferencia, v.Principal, v.Activo, v.Motivo,
       CASE WHEN v.Activo = 0 THEN DATEADD(DAY, -15, @Ahora) END, @Kim
FROM (VALUES
    (@PrTrans, CAST(NULL AS INT), N'Roberto Campos', N'Gerente de flota', '24430011', 'rcampos@transalajuela.example', CAST('1985-04-18' AS DATE), 'Teléfono', 1, 1, CAST(NULL AS NVARCHAR(300))),
    (@PrCosta, NULL, N'Daniela Fonseca', N'Jefa de compras', '26540022', 'compras@costaesmeralda.example', '1990-11-30', 'Correo', 1, 1, NULL),
    (@PrCosta, NULL, N'Mauricio Zeledón', N'Jefe de seguridad', '26540023', 'mzeledon@costaesmeralda.example', NULL, 'Cualquiera', 0, 1, NULL),
    (@PrMerid, NULL, N'Ing. Esteban Rojas', N'Director de proyectos', '22896633', 'erojas@meridiano.example', '1982-07-09', 'Teléfono', 1, 1, NULL),
    (@PrSeg, NULL, N'Luis Mena', N'Coordinador de operaciones', '27580044', 'operaciones@segatlantica.example', NULL, 'Cualquiera', 1, 1, NULL),
    (NULL, @CliHotel, N'Carolina Vega', N'Gerente de compras', '26300100', 'compras@lossuenos.example', '1987-02-14', 'Correo', 1, 1, NULL),
    (NULL, @CliHotel, N'Marcos Solís', N'Jefe de seguridad', '26300101', 'msolis@lossuenos.example', NULL, 'Teléfono', 0, 0, N'Ya no trabaja en la empresa'),
    (NULL, @CliBuses, N'Mario Quesada', N'Encargado de flota', '22550000', 'flota@autobusessj.example', '1979-09-23', 'Teléfono', 1, 1, NULL),
    (NULL, @CliBuses, N'Ana Villalobos', N'Administradora', '22550001', 'avillalobos@autobusessj.example', '1991-05-05', 'Correo', 0, 1, NULL),
    (NULL, @CliBomberos, N'Cap. Luis Araya', N'Jefe de logística', '22200000', 'logistica@bomberos.example', NULL, 'Cualquiera', 1, 1, NULL),
    (NULL, @CliMarina, N'Andrea Solís', N'Gerente de operaciones', '27770000', 'operaciones@pezvela.example', '1988-12-01', 'Correo', 1, 1, NULL)
) v(IdProspecto, IdCliente, Nombre, Cargo, Telefono, Correo, Cumple, Preferencia, Principal, Activo, Motivo)
WHERE (v.IdProspecto IS NOT NULL OR v.IdCliente IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM ContactoEmpresa c WHERE c.Nombre = v.Nombre AND ISNULL(c.IdProspecto, 0) = ISNULL(v.IdProspecto, 0) AND ISNULL(c.IdCliente, 0) = ISNULL(v.IdCliente, 0));

-- ===================== 3) Notas e interacciones =====================
INSERT INTO NotaCRM (IdProspecto, IdCliente, Categoria, Texto, Visibilidad, IdUsuario, Fecha)
SELECT v.IdProspecto, v.IdCliente, v.Categoria, v.Texto, v.Visibilidad, v.Autor, DATEADD(DAY, -v.Dias, @Ahora)
FROM (VALUES
    (@PrCosta, CAST(NULL AS INT), 'Comercial', N'Necesitan 60 radios para temporada alta; el presupuesto lo aprueba la gerencia general a fin de mes.', 'Equipo', @Kim, 9),
    (@PrMerid, NULL, 'Comercial', N'Pidió comparar alquiler contra compra. Preparar escenario a 24 meses.', 'Equipo', @Henry, 10),
    (@PrSeg, NULL, 'General', N'Llamó por recomendación del cuerpo de Bomberos.', 'General', @Kim, 1),
    (NULL, @CliHotel, 'Técnica', N'Las antenas de la torre norte presentan interferencia; coordinar visita con el técnico.', 'Equipo', @Kim, 6),
    (NULL, @CliBuses, 'Facturación', N'Solicitan factura separada para las unidades de la ruta 3.', 'Privada', @Kim, 4)
) v(IdProspecto, IdCliente, Categoria, Texto, Visibilidad, Autor, Dias)
WHERE (v.IdProspecto IS NOT NULL OR v.IdCliente IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM NotaCRM n WHERE n.Texto = v.Texto);

INSERT INTO InteraccionCRM (IdProspecto, IdCliente, IdUsuario, Fecha, Tipo, Detalle, Resultado, ProximoPaso, IdContactoEmpresa)
SELECT v.IdProspecto, v.IdCliente, v.Autor, DATEADD(HOUR, v.Hora, DATEADD(DAY, -v.Dias, CAST(@Hoy AS DATETIME))), v.Tipo, v.Detalle, v.Resultado, v.Proximo,
       (SELECT TOP 1 c.IdContactoEmpresa FROM ContactoEmpresa c WHERE c.Nombre = v.Contacto AND ISNULL(c.IdProspecto, 0) = ISNULL(v.IdProspecto, 0) AND ISNULL(c.IdCliente, 0) = ISNULL(v.IdCliente, 0))
FROM (VALUES
    (@PrCosta, CAST(NULL AS INT), 'Llamada', N'Primera llamada de presentación de los servicios de alquiler.', N'Mostró interés en el plan de 60 radios.', N'Enviar cotización', @Kim, 12, 10, N'Daniela Fonseca'),
    (@PrCosta, NULL, 'Correo', N'Se envió la cotización con tres alternativas de plan.', N'Pendiente de respuesta.', N'Llamar el jueves para confirmar recepción', @Kim, 8, 15, N'Daniela Fonseca'),
    (@PrMerid, NULL, 'Reunión', N'Reunión en obra con el director de proyectos.', N'Pidió ajustar cantidades y comparar con compra.', N'Preparar escenario a 24 meses', @Henry, 9, 9, N'Ing. Esteban Rojas'),
    (@PrTrans, NULL, 'Visita', N'Visita a la terminal para medir cobertura.', N'Cobertura adecuada con una repetidora.', N'Elaborar cotización', @Kim, 2, 14, N'Roberto Campos'),
    (NULL, @CliHotel, 'Visita', N'Visita de seguimiento a la torre norte.', N'Se confirmó la interferencia en dos radios.', N'Coordinar visita técnica', @Kim, 6, 10, N'Carolina Vega'),
    (NULL, @CliBuses, 'Llamada', N'Llamada para confirmar la renovación del contrato.', N'Confirmó que renovarán por 12 meses.', N'Enviar propuesta de renovación', @Kim, 3, 16, N'Mario Quesada'),
    (NULL, @CliBomberos, 'Acuerdo', N'Se acordó una capacitación sobre uso de repetidora para el personal nuevo.', N'Capacitación aprobada.', N'Agendar fecha de capacitación', @Kim, 14, 11, N'Cap. Luis Araya')
) v(IdProspecto, IdCliente, Tipo, Detalle, Resultado, Proximo, Autor, Dias, Hora, Contacto)
WHERE (v.IdProspecto IS NOT NULL OR v.IdCliente IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM InteraccionCRM i WHERE i.Detalle = v.Detalle);

-- ===================== 4) Seguimientos y series =====================
-- Un seguimiento cuya hora ya pasó se siembra como «Atrasado», igual que lo marcaría el sistema.
INSERT INTO SeguimientoCRM (IdProspecto, IdCliente, IdContactoEmpresa, Tipo, FechaHora, FechaHoraOriginal, Motivo, Prioridad, IdResponsable, Estado, Origen, IdUsuarioCrea)
SELECT v.IdProspecto, v.IdCliente,
       (SELECT TOP 1 c.IdContactoEmpresa FROM ContactoEmpresa c WHERE c.Nombre = v.Contacto AND ISNULL(c.IdProspecto, 0) = ISNULL(v.IdProspecto, 0) AND ISNULL(c.IdCliente, 0) = ISNULL(v.IdCliente, 0)),
       v.Tipo, v.Cuando, v.Cuando, v.Motivo, v.Prioridad, v.Responsable,
       CASE WHEN v.Cuando < @Ahora THEN 'Atrasado' ELSE 'Pendiente' END, 'Manual', v.Responsable
FROM (VALUES
    (@PrCosta, CAST(NULL AS INT), 'Llamada', DATEADD(HOUR, 10, DATEADD(DAY, -1, CAST(@Hoy AS DATETIME2(0)))), N'Confirmar que Daniela recibió la cotización', 'Alta', @Kim, N'Daniela Fonseca'),
    (@PrTrans, NULL, 'Correo', DATEADD(HOUR, 17, CAST(@Hoy AS DATETIME2(0))), N'Enviar cotización de repetidora y 35 radios', 'Alta', @Kim, N'Roberto Campos'),
    (@PrMerid, NULL, 'Reunión', DATEADD(HOUR, 9, DATEADD(DAY, 1, CAST(@Hoy AS DATETIME2(0)))), N'Presentar escenario alquiler vs compra a 24 meses', 'Alta', @Henry, N'Ing. Esteban Rojas'),
    (@PrSeg, NULL, 'Llamada', DATEADD(HOUR, 14, DATEADD(DAY, 2, CAST(@Hoy AS DATETIME2(0)))), N'Primera llamada de presentación de servicios', 'Media', @Kim, N'Luis Mena'),
    (NULL, @CliHotel, 'Visita', DATEADD(HOUR, 11, DATEADD(DAY, 3, CAST(@Hoy AS DATETIME2(0)))), N'Visita técnica por interferencia en la torre norte', 'Media', @Kim, N'Carolina Vega'),
    (NULL, @CliBuses, 'Correo', DATEADD(HOUR, 15, DATEADD(DAY, 5, CAST(@Hoy AS DATETIME2(0)))), N'Enviar propuesta de renovación de contrato', 'Baja', @Kim, N'Mario Quesada')
) v(IdProspecto, IdCliente, Tipo, Cuando, Motivo, Prioridad, Responsable, Contacto)
WHERE (v.IdProspecto IS NOT NULL OR v.IdCliente IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM SeguimientoCRM s WHERE s.Motivo = v.Motivo);

-- Un seguimiento completado (con su interacción vinculada) y uno cancelado, para mostrar el ciclo completo.
IF @PrMerid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM SeguimientoCRM WHERE Motivo = N'Llamada de bienvenida tras la reunión en feria')
BEGIN
    DECLARE @IdInt INT;
    DECLARE @CuandoCompl DATETIME2(0) = DATEADD(HOUR, 11, DATEADD(DAY, -4, CAST(@Hoy AS DATETIME2(0))));
    INSERT INTO InteraccionCRM (IdProspecto, IdUsuario, Fecha, Tipo, Detalle, Resultado, ProximoPaso)
    VALUES (@PrMerid, @Henry, @CuandoCompl, 'Llamada', N'Llamada de bienvenida tras la reunión en feria', N'Atendió la llamada y pidió información por correo.', N'Enviar brochure de planes');
    SET @IdInt = SCOPE_IDENTITY();
    INSERT INTO SeguimientoCRM (IdProspecto, Tipo, FechaHora, FechaHoraOriginal, Motivo, Prioridad, IdResponsable, Estado, Origen, FechaReal, Resultado, ProximoPaso, FechaCierre, IdUsuarioCierre, IdInteraccion, IdUsuarioCrea)
    VALUES (@PrMerid, 'Llamada', @CuandoCompl, @CuandoCompl, N'Llamada de bienvenida tras la reunión en feria', 'Media', @Henry, 'Completado', 'Manual', @CuandoCompl,
            N'Atendió la llamada y pidió información por correo.', N'Enviar brochure de planes', SYSUTCDATETIME(), @Henry, @IdInt, @Henry);
END

IF @PrCosta IS NOT NULL AND NOT EXISTS (SELECT 1 FROM SeguimientoCRM WHERE Motivo = N'Visita al hotel para medir cobertura')
    INSERT INTO SeguimientoCRM (IdProspecto, Tipo, FechaHora, FechaHoraOriginal, Motivo, Prioridad, IdResponsable, Estado, Origen, MotivoCancelacion, FechaCierre, IdUsuarioCierre, IdUsuarioCrea)
    VALUES (@PrCosta, 'Visita', DATEADD(HOUR, 9, DATEADD(DAY, -6, CAST(@Hoy AS DATETIME2(0)))), DATEADD(HOUR, 9, DATEADD(DAY, -6, CAST(@Hoy AS DATETIME2(0)))),
            N'Visita al hotel para medir cobertura', 'Media', @Kim, 'Cancelado', 'Manual', N'El cliente pidió hacerlo por videollamada.', SYSUTCDATETIME(), @Kim, @Kim);

-- Serie de contactos periódicos: contacto mensual al Hotel Los Sueños que empezó hace 2 meses (12 ocurrencias generadas).
IF @CliHotel IS NOT NULL AND NOT EXISTS (SELECT 1 FROM SerieContactoCRM WHERE Motivo = N'Contacto mensual de cortesía y revisión del servicio')
BEGIN
    DECLARE @IdSerie INT, @FechaIni DATE = DATEADD(MONTH, -2, @Hoy), @Idx INT = 0, @FechaOc DATE, @Cuando DATETIME2(0), @IdContHotel INT;
    SET @IdContHotel = (SELECT TOP 1 IdContactoEmpresa FROM ContactoEmpresa WHERE Nombre = N'Carolina Vega' AND IdCliente = @CliHotel);

    INSERT INTO SerieContactoCRM (IdCliente, IdContactoEmpresa, Periodicidad, FechaInicial, Hora, Tipo, Motivo, Prioridad, IdResponsable, OcurrenciasGeneradas, IdUsuarioCrea)
    VALUES (@CliHotel, @IdContHotel, 'Mensual', @FechaIni, '09:00', 'Llamada', N'Contacto mensual de cortesía y revisión del servicio', 'Media', @Kim, 12, @Kim);
    SET @IdSerie = SCOPE_IDENTITY();

    WHILE @Idx < 12
    BEGIN
        SET @FechaOc = dbo.fn_CrmSerie_Fecha(@FechaIni, 'Mensual', @Idx);
        SET @Cuando = DATEADD(HOUR, 9, CAST(@FechaOc AS DATETIME2(0)));
        INSERT INTO SeguimientoCRM (IdCliente, IdContactoEmpresa, Tipo, FechaHora, FechaHoraOriginal, Motivo, Prioridad, IdResponsable, Estado, Origen, IdSerie, FechaReal, Resultado, FechaCierre, IdUsuarioCierre, IdUsuarioCrea)
        VALUES (@CliHotel, @IdContHotel, 'Llamada', @Cuando, @Cuando, N'Contacto mensual de cortesía y revisión del servicio', 'Media', @Kim,
                CASE WHEN @Idx < 2 THEN 'Completado' WHEN @Cuando < @Ahora THEN 'Atrasado' ELSE 'Pendiente' END, 'Serie', @IdSerie,
                CASE WHEN @Idx < 2 THEN @Cuando END, CASE WHEN @Idx < 2 THEN N'Sin novedades; el cliente está satisfecho con el servicio.' END,
                CASE WHEN @Idx < 2 THEN SYSUTCDATETIME() END, CASE WHEN @Idx < 2 THEN @Kim END, @Kim);
        SET @Idx += 1;
    END
END

-- Historial de los seguimientos sembrados (una fila «Creado» por seguimiento que aún no tiene historial)
INSERT INTO SeguimientoHistorial (IdSeguimiento, Accion, FechaHoraNueva, IdUsuario)
SELECT s.IdSeguimiento, 'Creado', s.FechaHoraOriginal, s.IdUsuarioCrea
FROM SeguimientoCRM s
WHERE NOT EXISTS (SELECT 1 FROM SeguimientoHistorial h WHERE h.IdSeguimiento = s.IdSeguimiento);

-- ===================== 5) Facturación de prueba =====================
INSERT INTO PlantillaContrato (Nombre, Descripcion, Contenido, Activa, IdUsuarioCrea)
SELECT v.Nombre, v.Descripcion, v.Contenido, v.Activa, @Admin
FROM (VALUES
    (N'Contrato de alquiler estándar', N'Alquiler mensual de radios portátiles con mantenimiento incluido.',
     N'CONTRATO DE ALQUILER DE EQUIPO DE RADIOCOMUNICACIÓN' + CHAR(13) + CHAR(10) + N'Entre Radifax y {{CLIENTE}} se acuerda el alquiler de los equipos descritos, por un plazo de {{PLAZO}} y un monto mensual de {{MONTO_MENSUAL}}.', 1),
    (N'Contrato de alquiler de repetidora', N'Alquiler de repetidora con instalación y visita preventiva trimestral.',
     N'CONTRATO DE ALQUILER DE REPETIDORA' + CHAR(13) + CHAR(10) + N'Radifax instala y mantiene la repetidora en el sitio {{SITIO}} a favor de {{CLIENTE}}.', 1),
    (N'Contrato anterior (descontinuado)', N'Plantilla en desuso, se conserva por trazabilidad.', N'Texto de la plantilla anterior.', 0)
) v(Nombre, Descripcion, Contenido, Activa)
WHERE NOT EXISTS (SELECT 1 FROM PlantillaContrato p WHERE p.Nombre = v.Nombre);

INSERT INTO Factura (NumeroFactura, Tipo, IdCliente, IdVendedor, Fecha, FechaVencimientoPago, Moneda, Subtotal, Impuesto, Total, Estado, EstadoCobro, IncluyeBaterias, Observaciones, IdUsuarioRegistra)
SELECT v.Numero, v.Tipo, v.IdCliente, @Kim, DATEADD(DAY, -v.Dias, @Hoy), DATEADD(DAY, 30 - v.Dias, @Hoy), 'CRC', v.Subtotal, ROUND(v.Subtotal * 0.13, 2), ROUND(v.Subtotal * 1.13, 2),
       'Emitida', v.Cobro, v.Baterias, v.Obs, @Admin
FROM (VALUES
    ('FA-2026-0001', 'Venta', @CliHotel, 20, CAST(180000 AS DECIMAL(14, 2)), 'Pagada', 1, N'Venta de baterías KNB-45 para los radios del hotel.'),
    ('FA-2026-0002', 'Alquiler', @CliBuses, 12, CAST(310000 AS DECIMAL(14, 2)), 'Pendiente', 0, N'Alquiler mensual de radios de la flota.'),
    ('FA-2026-0003', 'Servicio', @CliBomberos, 5, CAST(45000 AS DECIMAL(14, 2)), 'Parcial', 0, N'Reparación de repetidora fuera de garantía.')
) v(Numero, Tipo, IdCliente, Dias, Subtotal, Cobro, Baterias, Obs)
WHERE v.IdCliente IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Factura f WHERE f.NumeroFactura = v.Numero);

INSERT INTO FacturaLinea (IdFactura, Descripcion, IdModelo, EsBateria, Cantidad, PrecioUnitario)
SELECT f.IdFactura, v.Descripcion, v.IdModelo, v.EsBateria, v.Cantidad, v.Precio
FROM (VALUES
    ('FA-2026-0001', N'Batería Li-Ion KNB-45', @ModBateria, 1, 6, 30000),
    ('FA-2026-0002', N'Alquiler mensual de radios portátiles (5 unidades)', CAST(NULL AS INT), 0, 1, 310000),
    ('FA-2026-0003', N'Mano de obra de reparación de repetidora', NULL, 0, 1, 45000)
) v(Numero, Descripcion, IdModelo, EsBateria, Cantidad, Precio)
INNER JOIN Factura f ON f.NumeroFactura = v.Numero
WHERE NOT EXISTS (SELECT 1 FROM FacturaLinea l WHERE l.IdFactura = f.IdFactura);

INSERT INTO CobroFactura (IdFactura, EstadoCobro, Monto, FechaCobro, MedioPago, Referencia, IdUsuario)
SELECT f.IdFactura, v.Estado, v.Monto, DATEADD(DAY, -v.Dias, @Hoy), v.Medio, v.Referencia, @Admin
FROM (VALUES
    ('FA-2026-0001', 'Pagada', CAST(203400.00 AS DECIMAL(14, 2)), 18, 'Transferencia', 'TRF-88120'),
    ('FA-2026-0003', 'Parcial', CAST(25000.00 AS DECIMAL(14, 2)), 2, 'Efectivo', CAST(NULL AS VARCHAR(100)))
) v(Numero, Estado, Monto, Dias, Medio, Referencia)
INNER JOIN Factura f ON f.NumeroFactura = v.Numero
WHERE NOT EXISTS (SELECT 1 FROM CobroFactura c WHERE c.IdFactura = f.IdFactura);

INSERT INTO NotaCredito (NumeroNota, IdFactura, Fecha, Monto, Motivo, IdUsuarioRegistra)
SELECT 'NC-2026-0001', f.IdFactura, DATEADD(DAY, -3, @Hoy), 5650, N'Ajuste por una batería devuelta con defecto de fábrica.', @Admin
FROM Factura f WHERE f.NumeroFactura = 'FA-2026-0001' AND NOT EXISTS (SELECT 1 FROM NotaCredito WHERE NumeroNota = 'NC-2026-0001');

INSERT INTO Encuesta (IdFactura, IdCliente, CorreoDestino, Estado, FechaEnvio, FechaExpiracion, FechaRespuesta, CalificacionGeneral, Comentario)
SELECT f.IdFactura, f.IdCliente, cl.Correo, v.Estado, DATEADD(DAY, -v.Dias, @Ahora), DATEADD(DAY, 30 - v.Dias, @Ahora),
       CASE WHEN v.Estado = 'Respondida' THEN DATEADD(DAY, 1 - v.Dias, @Ahora) END, v.Calificacion, v.Comentario
FROM (VALUES
    ('FA-2026-0001', 'Respondida', 17, CAST(5 AS TINYINT), CAST(N'Excelente atención, las baterías llegaron rápido.' AS NVARCHAR(1000))),
    ('FA-2026-0002', 'Enviada', 10, CAST(NULL AS TINYINT), CAST(NULL AS NVARCHAR(1000)))
) v(Numero, Estado, Dias, Calificacion, Comentario)
INNER JOIN Factura f ON f.NumeroFactura = v.Numero
INNER JOIN Cliente cl ON cl.IdCliente = f.IdCliente
WHERE NOT EXISTS (SELECT 1 FROM Encuesta e WHERE e.IdFactura = f.IdFactura);

INSERT INTO EncuestaRespuesta (IdEncuesta, Aspecto, Puntaje)
SELECT e.IdEncuesta, v.Aspecto, v.Puntaje
FROM Encuesta e
INNER JOIN Factura f ON f.IdFactura = e.IdFactura AND f.NumeroFactura = 'FA-2026-0001'
CROSS JOIN (VALUES (N'Atención del vendedor', CAST(5 AS TINYINT)), (N'Calidad del equipo', CAST(5 AS TINYINT)), (N'Tiempo de entrega', CAST(4 AS TINYINT))) v(Aspecto, Puntaje)
WHERE e.Estado = 'Respondida'
  AND NOT EXISTS (SELECT 1 FROM EncuestaRespuesta r WHERE r.IdEncuesta = e.IdEncuesta AND r.Aspecto = v.Aspecto);

-- ===================== 6) Recordatorios de baterías (once meses después de la compra) =====================
INSERT INTO RecordatorioBateria (IdCliente, IdContactoEmpresa, IdFactura, NumeroFactura, IdModelo, ModeloBateria, Cantidad, FechaCompra, FechaRecordatorio, IdVendedor, Estado,
                                 FechaNotificacion, FechaAtencion, MedioAtencion, ResultadoAtencion, ObservacionAtencion, ProximoPasoAtencion, IdUsuarioAtencion, MotivoCierre, FechaCierre, IdUsuarioCrea)
SELECT v.IdCliente,
       (SELECT TOP 1 c.IdContactoEmpresa FROM ContactoEmpresa c WHERE c.IdCliente = v.IdCliente AND c.EsPrincipal = 1 AND c.Activo = 1),
       (SELECT IdFactura FROM Factura WHERE NumeroFactura = v.Factura), v.Factura, @ModBateria, N'Kenwood KNB-45', v.Cantidad,
       v.Compra, DATEADD(MONTH, 11, v.Compra), @Kim, v.Estado,
       CASE WHEN v.Estado IN ('Notificado', 'Atendido') THEN DATEADD(DAY, -2, @Ahora) END,
       CASE WHEN v.Estado = 'Atendido' THEN DATEADD(DAY, -1, @Ahora) END,
       CASE WHEN v.Estado = 'Atendido' THEN 'Llamada' END,
       CASE WHEN v.Estado = 'Atendido' THEN N'El cliente aceptó cotizar el reemplazo de las baterías.' END,
       CASE WHEN v.Estado = 'Atendido' THEN N'Pidió precio por volumen para 8 unidades.' END,
       CASE WHEN v.Estado = 'Atendido' THEN N'Enviar cotización el viernes' END,
       CASE WHEN v.Estado = 'Atendido' THEN @Kim END,
       CASE WHEN v.Estado = 'Cerrado' THEN N'Reemplazada por una compra nueva' END,
       CASE WHEN v.Estado = 'Cerrado' THEN DATEADD(DAY, -20, @Ahora) END, @Kim
FROM (VALUES
    (@CliBuses, 'FA-2025-0412', 10, DATEADD(MONTH, -11, @Hoy), 'Pendiente'),                       -- vence hoy: el servicio avisará
    (@CliHotel, 'FA-2025-0398', 6, DATEADD(DAY, -20, DATEADD(MONTH, -10, @Hoy)), 'Pendiente'),     -- vence en unos 10 días
    (@CliHotel, 'FA-2026-0001', 6, DATEADD(DAY, -20, @Hoy), 'Pendiente'),                          -- la compra de la factura de prueba
    (@CliBomberos, 'FA-2025-0377', 4, DATEADD(DAY, -5, DATEADD(MONTH, -11, @Hoy)), 'Notificado'),  -- ya avisado, sin atender
    (@CliMarina, 'FA-2025-0310', 8, DATEADD(DAY, -3, DATEADD(MONTH, -11, @Hoy)), 'Atendido'),
    (@CliMarina, 'FA-2024-0988', 8, DATEADD(MONTH, -14, @Hoy), 'Cerrado')                           -- cerrada por cambio anticipado
) v(IdCliente, Factura, Cantidad, Compra, Estado)
WHERE v.IdCliente IS NOT NULL AND @ModBateria IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM RecordatorioBateria r WHERE r.IdCliente = v.IdCliente AND r.NumeroFactura = v.Factura);
