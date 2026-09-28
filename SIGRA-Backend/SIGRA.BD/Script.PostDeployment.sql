/*
Datos semilla para poder probar GUA-013 a GUA-017 de punta a punta.
Idempotente: se puede volver a publicar el proyecto sin duplicar filas.
*/

SET NOCOUNT ON;

-- 1) Roles (deben coincidir exactamente con los nombres usados en el frontend y en [Authorize(Roles = "...")])
DECLARE @Roles TABLE (Nombre VARCHAR(100));
INSERT INTO @Roles (Nombre) VALUES
    (N'Administrador del sistema'),
    (N'Gerente'),
    (N'Coordinador técnico'),
    (N'Técnico'),
    (N'Vendedor / Ejecutivo de cuenta');

INSERT INTO Rol (Nombre, Activo)
SELECT n.Nombre, 1
FROM @Roles n
WHERE NOT EXISTS (SELECT 1 FROM Rol r WHERE r.Nombre = n.Nombre);

-- 2) Módulos (IdModulo debe coincidir con MODULE_KEY_TO_ID del frontend: src/data/roleCapabilities.js)
-- 1=usuarios 2=tickets 3=alquiler 4=inventario 5=dashboard 6=ia 7=contratos 8=giras 9=crm 10=clientes 11=frecuencias
DECLARE @Modulos TABLE (IdModulo INT);
INSERT INTO @Modulos (IdModulo) VALUES (1), (2), (3), (4), (5), (6), (7), (8), (9), (10), (11);

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
