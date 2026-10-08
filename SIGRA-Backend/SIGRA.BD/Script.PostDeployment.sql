/*
Datos semilla para poder probar GUA-013 a GUA-017 de punta a punta.
Idempotente: se puede volver a publicar el proyecto sin duplicar filas.
*/

SET NOCOUNT ON;

-- 1) Roles (deben coincidir exactamente con los nombres usados en el frontend y en [Authorize(Roles = "...")])
DECLARE @Roles TABLE (Nombre VARCHAR(100), Descripcion VARCHAR(250));
INSERT INTO @Roles (Nombre, Descripcion) VALUES
    (N'Administrador del sistema', N'Acceso total a todos los módulos: configuración, seguridad, roles y permisos.'),
    (N'Gerente', N'Acceso de solo lectura a los módulos operativos y reportes de la empresa.'),
    (N'Coordinador técnico', N'Coordina tickets, giras y asignación de técnicos e inventario de equipos.'),
    (N'Técnico', N'Ejecuta tickets de servicio técnico y reporta el estado de los equipos en campo.'),
    (N'Vendedor / Ejecutivo de cuenta', N'Gestiona contratos, clientes, prospectos (CRM) y frecuencias de radio.');

INSERT INTO Rol (Nombre, Descripcion, Activo)
SELECT n.Nombre, n.Descripcion, 1
FROM @Roles n
WHERE NOT EXISTS (SELECT 1 FROM Rol r WHERE r.Nombre = n.Nombre);

-- 2) Módulos: catálogo real (antes solo existían como números documentados en comentarios del frontend).
-- IdModulo debe coincidir con MODULE_KEY_TO_ID del frontend: src/data/roleCapabilities.js
DECLARE @Modulos TABLE (IdModulo INT, Nombre VARCHAR(100));
INSERT INTO @Modulos (IdModulo, Nombre) VALUES
    (1, N'Usuarios y accesos'),
    (2, N'Tickets de servicio técnico'),
    (3, N'Alquiler de radios y repetidoras'),
    (4, N'Inventario de equipos'),
    (5, N'Dashboard y reportes'),
    (6, N'Agente de inteligencia artificial'),
    (7, N'Contratos y facturación'),
    (8, N'Giras y planificación de rutas'),
    (9, N'CRM y prospectos'),
    (10, N'Clientes'),
    (11, N'Frecuencias de radio');

INSERT INTO Modulo (IdModulo, Nombre, Activo)
SELECT m.IdModulo, m.Nombre, 1
FROM @Modulos m
WHERE NOT EXISTS (SELECT 1 FROM Modulo mo WHERE mo.IdModulo = m.IdModulo);

INSERT INTO Permiso (IdModulo)
SELECT m.IdModulo
FROM @Modulos m
WHERE NOT EXISTS (SELECT 1 FROM Permiso p WHERE p.IdModulo = m.IdModulo);

-- 3) Permisos por rol (Lectura, Escritura, Edicion, Eliminacion) — replica roleCapabilities.js del frontend
DECLARE @RolPermisoSeed TABLE (
    RolNombre   VARCHAR(100),
    IdModulo    INT,
    Lectura     BIT,
    Escritura   BIT,
    Edicion     BIT,
    Eliminacion BIT
);

INSERT INTO @RolPermisoSeed (RolNombre, IdModulo, Lectura, Escritura, Edicion, Eliminacion)
VALUES
    -- Administrador del sistema: acceso total a los 11 módulos
    (N'Administrador del sistema', 1, 1, 1, 1, 1),
    (N'Administrador del sistema', 2, 1, 1, 1, 1),
    (N'Administrador del sistema', 3, 1, 1, 1, 1),
    (N'Administrador del sistema', 4, 1, 1, 1, 1),
    (N'Administrador del sistema', 5, 1, 1, 1, 1),
    (N'Administrador del sistema', 6, 1, 1, 1, 1),
    (N'Administrador del sistema', 7, 1, 1, 1, 1),
    (N'Administrador del sistema', 8, 1, 1, 1, 1),
    (N'Administrador del sistema', 9, 1, 1, 1, 1),
    (N'Administrador del sistema', 10, 1, 1, 1, 1),
    (N'Administrador del sistema', 11, 1, 1, 1, 1),

    -- Gerente: solo lectura, todos los módulos menos IA (que es exclusivo del administrador)
    (N'Gerente', 1, 1, 0, 0, 0),
    (N'Gerente', 2, 1, 0, 0, 0),
    (N'Gerente', 3, 1, 0, 0, 0),
    (N'Gerente', 4, 1, 0, 0, 0),
    (N'Gerente', 5, 1, 0, 0, 0),
    (N'Gerente', 7, 1, 0, 0, 0),
    (N'Gerente', 8, 1, 0, 0, 0),
    (N'Gerente', 9, 1, 0, 0, 0),
    (N'Gerente', 10, 1, 0, 0, 0),
    (N'Gerente', 11, 1, 0, 0, 0),

    -- Coordinador técnico
    (N'Coordinador técnico', 2, 1, 1, 1, 1),
    (N'Coordinador técnico', 3, 1, 0, 0, 0),
    (N'Coordinador técnico', 4, 1, 1, 1, 0),
    (N'Coordinador técnico', 5, 1, 0, 0, 0),
    (N'Coordinador técnico', 8, 1, 1, 1, 1),
    (N'Coordinador técnico', 10, 1, 0, 0, 0),

    -- Técnico
    (N'Técnico', 2, 1, 1, 1, 0),
    (N'Técnico', 3, 1, 0, 0, 0),
    (N'Técnico', 4, 1, 1, 1, 0),
    (N'Técnico', 5, 1, 0, 0, 0),
    (N'Técnico', 8, 1, 0, 0, 0),

    -- Vendedor / Ejecutivo de cuenta
    (N'Vendedor / Ejecutivo de cuenta', 3, 1, 1, 1, 0),
    (N'Vendedor / Ejecutivo de cuenta', 5, 1, 0, 0, 0),
    (N'Vendedor / Ejecutivo de cuenta', 7, 1, 1, 1, 0),
    (N'Vendedor / Ejecutivo de cuenta', 8, 1, 0, 0, 0),
    (N'Vendedor / Ejecutivo de cuenta', 9, 1, 1, 1, 1),
    (N'Vendedor / Ejecutivo de cuenta', 10, 1, 1, 1, 0),
    (N'Vendedor / Ejecutivo de cuenta', 11, 1, 1, 1, 0);

INSERT INTO RolPermiso (IdRol, IdPermiso, Lectura, Escritura, Edicion, Eliminacion)
SELECT r.IdRol, p.IdPermiso, s.Lectura, s.Escritura, s.Edicion, s.Eliminacion
FROM @RolPermisoSeed s
INNER JOIN Rol r ON r.Nombre = s.RolNombre
INNER JOIN Permiso p ON p.IdModulo = s.IdModulo
WHERE NOT EXISTS (
    SELECT 1 FROM RolPermiso rp WHERE rp.IdRol = r.IdRol AND rp.IdPermiso = p.IdPermiso
);

-- 4) Política de seguridad inicial (obligatoria: el login falla si no existe ninguna activa)
IF NOT EXISTS (SELECT 1 FROM PoliticaSeguridad WHERE Activa = 1)
BEGIN
    INSERT INTO PoliticaSeguridad
        (MinutosInactividad, MaxIntentosFallidos, LongitudMinimaPassword, MinutosBloqueo, VigenciaEnlaceMinutos, IdUsuarioCreador, Activa)
    VALUES
        (30, 5, 8, 15, 30, NULL, 1);
END

-- 5) Usuarios de prueba (mismas cuentas que ya usaba el prototipo de frontend en Auth.jsx)
-- Contraseñas en texto plano (solo para pruebas manuales), ya hasheadas con BCrypt abajo:
--   ricardo.infante@radifaxcr.com  / RadifaxCR2026
--   maria.ceciliano@radifaxcr.com  / Coord#2026
--   kimberly.sanchez@radifaxcr.com / Ventas#2026
--   adriana.mora@radifaxcr.com     / Gerencia#2026
--   admin@radifaxcr.com            / Admin#2026
DECLARE @Usuarios TABLE (
    Correo       VARCHAR(150),
    Nombre       VARCHAR(150),
    RolNombre    VARCHAR(100),
    PasswordHash VARCHAR(255)
);

INSERT INTO @Usuarios (Correo, Nombre, RolNombre, PasswordHash) VALUES
    (N'ricardo.infante@radifaxcr.com', N'Ricardo Infante', N'Técnico', '$2a$12$Ksu6VTKkzjpsV7nhvq3Gg.VuvrS8yMiwAGKCnh/pxueeZ7eR0OGMy'),
    (N'maria.ceciliano@radifaxcr.com', N'María Fernanda Ceciliano', N'Coordinador técnico', '$2a$12$UMF.EBZ4Bft4Apkvh3tI/.qcqLbgzlkGgLJTB2Ayqmp/sOympz9bq'),
    (N'kimberly.sanchez@radifaxcr.com', N'Kimberly Sánchez', N'Vendedor / Ejecutivo de cuenta', '$2a$12$NiALQc5ejgRFrzOSYgLd0OHGhaNB07k1Oz6vvDqF34eR5D18e9Pqi'),
    (N'adriana.mora@radifaxcr.com', N'Adriana Mora Quirós', N'Gerente', '$2a$12$8btPNda6tJ4wSnXWJvhoEOJC6qtiFeG/fMAR4pANcuk.X5rlNsN4i'),
    (N'admin@radifaxcr.com', N'Administrador Radifax', N'Administrador del sistema', '$2a$12$wcAHhIRfABU/om0sYu9IHO6zy5d0NxVjZOtzVWaaJSlqEkrAqYSKO');

INSERT INTO Usuario (IdRol, Nombre, Correo, PasswordHash, Activo, IntentosFallidos)
SELECT r.IdRol, u.Nombre, u.Correo, u.PasswordHash, 1, 0
FROM @Usuarios u
INNER JOIN Rol r ON r.Nombre = u.RolNombre
WHERE NOT EXISTS (SELECT 1 FROM Usuario ex WHERE ex.Correo = u.Correo);


-- 6) Datos personales de ejemplo para las cuentas de prueba (solo se completan los que estan vacios)
DECLARE @DatosCuentas TABLE (
    Correo VARCHAR(150), Cedula VARCHAR(20), FechaNacimiento DATE, Direccion VARCHAR(300),
    EstadoCivil VARCHAR(50), GradoAcademico VARCHAR(100), Salario DECIMAL(18,2)
);

INSERT INTO @DatosCuentas VALUES
    ('admin@radifaxcr.com',            '101110111', '1985-03-12', N'San José, Escazú',          N'Soltero/a',   N'Licenciatura',              1500000),
    ('adriana.mora@radifaxcr.com',     '112220222', '1980-07-21', N'Heredia, Barva',            N'Casado/a',    N'Maestría',                  2100000),
    ('maria.ceciliano@radifaxcr.com',  '303330333', '1992-11-05', N'Cartago, Paraíso',          N'Soltero/a',   N'Bachillerato universitario',1300000),
    ('ricardo.infante@radifaxcr.com',  '204440444', '1990-02-17', N'Alajuela, Grecia',          N'Casado/a',    N'Técnico',                    950000),
    ('tomas.diaz@radifaxcr.com',       '405550555', '1995-09-30', N'San José, Desamparados',    N'Soltero/a',   N'Diplomado',                  900000),
    ('kimberly.sanchez@radifaxcr.com', '506660666', '1993-06-14', N'Heredia, Santo Domingo',    N'Unión libre', N'Licenciatura',              1100000),
    ('henry.ortiz@radifaxcr.com',      '607770777', '1988-12-01', N'Puntarenas, Esparza',       N'Divorciado/a',N'Bachillerato universitario',1050000);

UPDATE u
SET Cedula          = COALESCE(u.Cedula, d.Cedula),
    FechaNacimiento = COALESCE(u.FechaNacimiento, d.FechaNacimiento),
    Direccion       = COALESCE(u.Direccion, d.Direccion),
    EstadoCivil     = COALESCE(u.EstadoCivil, d.EstadoCivil),
    GradoAcademico  = COALESCE(u.GradoAcademico, d.GradoAcademico),
    Salario         = COALESCE(u.Salario, d.Salario),
    FechaCreacion   = COALESCE(u.FechaCreacion, SYSUTCDATETIME())
FROM Usuario u
INNER JOIN @DatosCuentas d ON d.Correo = u.Correo;


-- 7) Inventario: catalogo base y equipos de ejemplo (solo se insertan si no existen)
INSERT INTO CategoriaEquipo (Nombre, ManejaCantidad)
SELECT v.Nombre, v.ManejaCantidad
FROM (VALUES
    (N'Radio portátil', 0), (N'Radio móvil', 0), (N'Repetidora', 0),
    (N'Accesorio', 1), (N'Repuesto', 1), (N'Batería', 1)
) AS v(Nombre, ManejaCantidad)
WHERE NOT EXISTS (SELECT 1 FROM CategoriaEquipo c WHERE c.Nombre = v.Nombre);

INSERT INTO Proveedor (Nombre, Contacto, Correo, Telefono)
SELECT v.Nombre, v.Contacto, v.Correo, v.Telefono
FROM (VALUES
    (N'Motorola Solutions Costa Rica', N'Laura Jiménez', 'ventas@motorola-cr.example', '22001000'),
    (N'Kenwood Latinoamérica', N'Pablo Rojas', 'pedidos@kenwood-la.example', '22002000'),
    (N'Hytera Comunicaciones', N'Marta Solís', 'cuentas@hytera-cr.example', '22003000'),
    (N'Distribuidora Tecnológica CR', N'Andrés Mora', 'contacto@distec.example', '22004000')
) AS v(Nombre, Contacto, Correo, Telefono)
WHERE NOT EXISTS (SELECT 1 FROM Proveedor p WHERE p.Nombre = v.Nombre);

INSERT INTO ModeloEquipo (IdCategoria, Marca, Modelo, DescripcionTecnica)
SELECT c.IdCategoria, v.Marca, v.Modelo, v.Descripcion
FROM (VALUES
    (N'Radio portátil', 'Motorola', 'CP200', N'Radio portátil VHF/UHF, 16 canales, 4 W'),
    (N'Radio portátil', 'Kenwood', 'TK-3170', N'Radio portátil UHF, 16 canales, 5 W'),
    (N'Radio portátil', 'Kenwood', 'TK-3401', N'Radio portátil UHF, 16 canales, 4 W, resistente al agua'),
    (N'Radio móvil', 'Motorola', 'DGM4100', N'Radio móvil digital VHF, 25 W'),
    (N'Repetidora', 'Motorola', 'SLR 1000', N'Repetidora UHF de 40 W, duplexor integrado'),
    (N'Batería', 'Kenwood', 'KNB-45', N'Batería Li-Ion 1550 mAh para serie TK-3000'),
    (N'Accesorio', 'Motorola', 'Antena UHF', N'Antena helicoidal UHF 450-470 MHz')
) AS v(Categoria, Marca, Modelo, Descripcion)
INNER JOIN CategoriaEquipo c ON c.Nombre = v.Categoria
WHERE NOT EXISTS (SELECT 1 FROM ModeloEquipo m WHERE m.IdCategoria = c.IdCategoria AND m.Marca = v.Marca AND m.Modelo = v.Modelo);

INSERT INTO StockMinimoCategoria (IdCategoria, CantidadMinima)
SELECT c.IdCategoria, v.Minimo
FROM (VALUES (N'Radio portátil', 5), (N'Batería', 10), (N'Repetidora', 1)) AS v(Categoria, Minimo)
INNER JOIN CategoriaEquipo c ON c.Nombre = v.Categoria
WHERE NOT EXISTS (SELECT 1 FROM StockMinimoCategoria s WHERE s.IdCategoria = c.IdCategoria);

IF NOT EXISTS (SELECT 1 FROM Equipo)
BEGIN
    DECLARE @IdAdminInv INT = (SELECT TOP 1 IdUsuario FROM Usuario WHERE Correo = 'admin@radifaxcr.com');

    INSERT INTO Equipo (IdModelo, IdProveedor, NumeroSerie, Estado, Propietario, Ubicacion, FechaAdquisicion, CostoCompra, Cantidad)
    SELECT m.IdModelo, p.IdProveedor, v.Serie, v.Estado, v.Propietario, v.Ubicacion, v.Fecha, v.Costo, v.Cantidad
    FROM (VALUES
        ('SN-88213', 'Motorola', 'CP200',   N'Motorola Solutions Costa Rica', 'Disponible',        'Radifax', N'Bodega San José', '2025-02-10', 185000, 1),
        ('SN-88214', 'Kenwood',  'TK-3170', N'Kenwood Latinoamérica',        'Alquilado',         'Radifax', N'Hotel Los Sueños', '2025-03-04', 142000, 1),
        ('SN-88215', 'Kenwood',  'TK-3170', N'Kenwood Latinoamérica',        'Disponible',        'Radifax', N'Bodega San José', '2025-03-04', 142000, 1),
        ('SN-88216', 'Kenwood',  'TK-3170', N'Kenwood Latinoamérica',        'Disponible',        'Radifax', N'Bodega San José', '2025-03-04', 142000, 1),
        ('SN-90011', 'Motorola', 'CP200',   N'Motorola Solutions Costa Rica', 'En mantenimiento', 'Radifax', N'Taller Radifax', '2024-11-18', 185000, 1),
        ('SN-90032', 'Kenwood',  'TK-3401', N'Kenwood Latinoamérica',        'Alquilado',         'Radifax', N'Autobuses San José', '2025-06-20', 158000, 1),
        ('SN-90033', 'Kenwood',  'TK-3401', N'Kenwood Latinoamérica',        N'En garantía',      'Radifax', N'Taller Radifax', '2025-06-20', 158000, 1),
        ('SN-70101', 'Motorola', 'DGM4100', N'Motorola Solutions Costa Rica', 'Disponible',        'Radifax', N'Bodega San José', '2025-01-15', 320000, 1),
        ('SN-77002', 'Motorola', 'SLR 1000', N'Motorola Solutions Costa Rica', N'En reparación',  'Radifax', N'Taller Radifax', '2024-08-09', 1450000, 1),
        ('SN-77003', 'Motorola', 'SLR 1000', N'Motorola Solutions Costa Rica', 'Alquilado',       N'Cliente', N'Cerro Buena Vista', '2025-09-01', 1450000, 1),
        ('SN-60001', 'Motorola', 'CP200',   N'Motorola Solutions Costa Rica', 'Dado de baja',     'Radifax', N'Bodega San José', '2022-05-02', 120000, 1),
        ('LT-KNB45-01', 'Kenwood', 'KNB-45', N'Distribuidora Tecnológica CR', 'Disponible',       'Radifax', N'Bodega San José', '2026-01-12', 18000, 24),
        ('LT-ANT-01',   'Motorola', 'Antena UHF', N'Distribuidora Tecnológica CR', 'Disponible',  'Radifax', N'Bodega San José', '2026-01-12', 6500, 15)
    ) AS v(Serie, Marca, Modelo, Proveedor, Estado, Propietario, Ubicacion, Fecha, Costo, Cantidad)
    INNER JOIN ModeloEquipo m ON m.Marca = v.Marca AND m.Modelo = v.Modelo
    INNER JOIN Proveedor p ON p.Nombre = v.Proveedor;

    UPDATE Equipo SET FechaBaja = '2026-03-15', MotivoBaja = N'Daño irreparable en la placa principal' WHERE NumeroSerie = 'SN-60001';

    INSERT INTO MovimientoInventario (IdEquipo, IdUsuario, TipoMovimiento, EstadoAnterior, EstadoNuevo, Fecha, Observacion, Cantidad)
    SELECT e.IdEquipo, @IdAdminInv, 'Compra', NULL, 'Disponible', DATEADD(HOUR, 8, CAST(e.FechaAdquisicion AS DATETIME)),
           N'Alta del equipo en el inventario', e.Cantidad
    FROM Equipo e;

    INSERT INTO BitacoraEquipo (IdEquipo, Fecha, Descripcion)
    SELECT e.IdEquipo, DATEADD(HOUR, 8, CAST(e.FechaAdquisicion AS DATETIME)), N'Equipo registrado en el inventario con estado Disponible.'
    FROM Equipo e;

    INSERT INTO MovimientoInventario (IdEquipo, IdUsuario, TipoMovimiento, EstadoAnterior, EstadoNuevo, Fecha, Observacion)
    SELECT e.IdEquipo, @IdAdminInv, N'Cambio de estado', 'Disponible', e.Estado, DATEADD(DAY, 20, CAST(e.FechaAdquisicion AS DATETIME)), N'Cambio de estado registrado en el inventario'
    FROM Equipo e
    WHERE e.Estado <> 'Disponible';
END

INSERT INTO AccesorioModelo (IdModelo, Nombre, Cantidad)
SELECT m.IdModelo, v.Nombre, v.Cantidad
FROM (VALUES
    ('Motorola', 'CP200',   N'Cargador de escritorio', 12),
    ('Motorola', 'CP200',   N'Clip de cinturón', 30),
    ('Kenwood',  'TK-3170', N'Cargador de escritorio', 8),
    ('Kenwood',  'TK-3170', N'Audífono con micrófono', 20),
    ('Kenwood',  'TK-3401', N'Antena UHF', 10)
) AS v(Marca, Modelo, Nombre, Cantidad)
INNER JOIN ModeloEquipo m ON m.Marca = v.Marca AND m.Modelo = v.Modelo
WHERE NOT EXISTS (SELECT 1 FROM AccesorioModelo a WHERE a.IdModelo = m.IdModelo AND a.Nombre = v.Nombre);

INSERT INTO Repuesto (IdModelo, Nombre, Cantidad)
SELECT m.IdModelo, v.Nombre, v.Cantidad
FROM (VALUES
    ('Motorola', 'CP200',   N'Pantalla LCD', 6),
    ('Motorola', 'CP200',   N'Botón PTT', 14),
    ('Kenwood',  'TK-3170', N'Placa principal', 3),
    ('Motorola', 'SLR 1000', N'Fuente de poder', 2)
) AS v(Marca, Modelo, Nombre, Cantidad)
INNER JOIN ModeloEquipo m ON m.Marca = v.Marca AND m.Modelo = v.Modelo
WHERE NOT EXISTS (SELECT 1 FROM Repuesto r WHERE r.IdModelo = m.IdModelo AND r.Nombre = v.Nombre);


-- 8) Alquiler: clientes, contratos y contactos de ejemplo (solo si aun no hay contratos)
INSERT INTO Cliente (Empresa, Contacto, Correo, Telefono)
SELECT v.Empresa, v.Contacto, v.Correo, v.Telefono
FROM (VALUES
    (N'Hotel Los Sueños', N'Carolina Vega', 'compras@lossuenos.example', '26300000'),
    (N'Autobuses San José', N'Mario Quesada', 'flota@autobusessj.example', '22550000'),
    (N'Bomberos de Costa Rica', N'Cap. Luis Araya', 'logistica@bomberos.example', '22200000'),
    (N'Marina Pez Vela', N'Daniela Ruiz', 'operaciones@pezvela.example', '27770000')
) AS v(Empresa, Contacto, Correo, Telefono)
WHERE NOT EXISTS (SELECT 1 FROM Cliente c WHERE c.Empresa = v.Empresa);

IF NOT EXISTS (SELECT 1 FROM Contrato)
BEGIN
    DECLARE @IdVendedorCt INT = (SELECT TOP 1 IdUsuario FROM Usuario WHERE Correo = 'kimberly.sanchez@radifaxcr.com');

    INSERT INTO Contrato (IdCliente, Estado, FechaInicio, FechaVencimiento, MontoMensual, Condiciones, IdVendedor)
    SELECT c.IdCliente, 'Activo', v.Inicio, v.Vence, v.Monto, v.Condiciones, @IdVendedorCt
    FROM (VALUES
        (N'Hotel Los Sueños', '2025-11-02', '2026-11-02', 85000, N'Alquiler anual de radios para el personal del hotel. Incluye mantenimiento preventivo.'),
        (N'Autobuses San José', '2026-02-01', '2027-02-01', 120000, N'Radios móviles para la flota. Cambio de baterías incluido.'),
        (N'Bomberos de Costa Rica', '2026-05-15', '2027-05-15', 310000, N'Repetidora instalada en sitio propiedad del cliente.')
    ) AS v(Empresa, Inicio, Vence, Monto, Condiciones)
    INNER JOIN Cliente c ON c.Empresa = v.Empresa;

    INSERT INTO ContratoEquipo (IdContrato, IdEquipo, FechaAsignacion)
    SELECT ct.IdContrato, e.IdEquipo, ct.FechaInicio
    FROM (VALUES (N'Hotel Los Sueños', 'SN-88214'), (N'Autobuses San José', 'SN-90032'), (N'Bomberos de Costa Rica', 'SN-77003')) AS v(Empresa, Serie)
    INNER JOIN Cliente c ON c.Empresa = v.Empresa
    INNER JOIN Contrato ct ON ct.IdCliente = c.IdCliente
    INNER JOIN Equipo e ON e.NumeroSerie = v.Serie;

    INSERT INTO ContactoInicial (Empresa, Contacto, MedioContacto, DatoContacto, Motivo, IdVendedor, Estado, FechaRegistro, IdUsuarioRegistra)
    SELECT v.Empresa, v.Contacto, v.Medio, v.Dato, v.Motivo, @IdVendedorCt, 'Asignado', DATEADD(DAY, v.Dias, GETDATE()), (SELECT TOP 1 IdUsuario FROM Usuario WHERE Correo = 'admin@radifaxcr.com')
    FROM (VALUES
        (N'Marina Pez Vela', N'Daniela Ruiz', N'Teléfono', '27770000', N'Consulta por alquiler de 6 radios para temporada alta', -3),
        (N'Refinadora Costarricense', N'Jorge Salas', 'Correo', 'jsalas@refinadora.example', N'Cotización de repetidora para planta', -1)
    ) AS v(Empresa, Contacto, Medio, Dato, Motivo, Dias);

    INSERT INTO ContactoHistorial (IdContacto, IdUsuario, IdVendedorAnterior, IdVendedorNuevo, Motivo)
    SELECT IdContacto, IdUsuarioRegistra, NULL, @IdVendedorCt, N'Asignación inicial' FROM ContactoInicial;
END
