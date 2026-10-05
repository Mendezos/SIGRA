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
