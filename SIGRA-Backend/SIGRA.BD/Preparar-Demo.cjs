#!/usr/bin/env node
/*
 * Preparar-Demo.cjs
 *
 * Deja el sistema listo para la demostración con un solo comando: recrea una base de datos APARTE (por defecto
 * SIGRA_demo, nunca la base SIGRA de trabajo), la sincroniza, levanta la API sobre ella y carga todos los datos
 * de demostración. Conviene correrlo el día antes de la presentación: muchos estados (contratos por vencer,
 * seguimientos atrasados, recordatorios de baterías) se calculan con la fecha de hoy.
 *
 * Uso (desde SIGRA-Backend/SIGRA.BD, con SQL Server Express y Node instalados):
 *   node Preparar-Demo.cjs
 *   node Preparar-Demo.cjs --servidor "localhost\SQLEXPRESS" --base SIGRA_demo --puerto 5044
 *
 * Al terminar, la API queda corriendo en http://localhost:5044 (puerto que usa el frontend). Para el frontend:
 *   npm run dev   (en SIGRA-Prototipo)  -> http://localhost:5173
 * Para volver a levantar la API de la demostración sin recrear nada (por ejemplo, después de reiniciar el equipo):
 *   node Preparar-Demo.cjs --iniciar
 * Para detener la API de la demostración:
 *   node Preparar-Demo.cjs --detener
 *
 * Importante: no puede haber otra API en ese puerto. Si usted tiene la API normal corriendo, deténgala antes.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawn } = require("child_process");

const args = process.argv.slice(2);
const valor = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d; };
const SERVIDOR = valor("--servidor", "localhost\\SQLEXPRESS");
const BASE = valor("--base", "SIGRA_demo");
const PUERTO = valor("--puerto", "5044");
const RAIZ = path.resolve(__dirname, "..");                         // SIGRA-Backend
const CARPETA_API = path.join(os.tmpdir(), "sigra_demo_api");
const PID_ARCHIVO = path.join(CARPETA_API, "api.pid");
const TOKEN_ENCUESTA = "demo-encuesta-factura-0002";

const sqlcmd = (consulta) => execFileSync("sqlcmd", ["-S", SERVIDOR, "-E", "-b", "-Q", consulta], { encoding: "utf8" });
// Para sentencias con acentos y símbolos: se escribe un archivo UTF-8 con BOM y se ejecuta con la página de códigos 65001.
const sqlArchivo = (consulta) => {
    const ruta = path.join(os.tmpdir(), `sigra_demo_${process.pid}.sql`);
    fs.writeFileSync(ruta, "﻿" + consulta, "utf8");
    try { execFileSync("sqlcmd", ["-S", SERVIDOR, "-E", "-b", "-I", "-f", "65001", "-i", ruta], { encoding: "utf8" }); } finally { fs.rmSync(ruta, { force: true }); }
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const quienEscucha = () => {
    const salida = execFileSync("netstat", ["-ano"], { encoding: "utf8" });
    const linea = salida.split("\n").find((l) => l.includes(`:${PUERTO} `) && l.includes("LISTENING"));
    return linea ? linea.trim().split(/\s+/).pop() : null;
};
const detenerApi = () => {
    if (!fs.existsSync(PID_ARCHIVO)) return false;
    const pid = fs.readFileSync(PID_ARCHIVO, "utf8").trim();
    try { execFileSync("taskkill", ["/PID", pid, "/T", "/F"], { stdio: "ignore" }); } catch { /* ya estaba detenida */ }
    fs.rmSync(PID_ARCHIVO, { force: true });
    return true;
};

(async () => {
    if (args.includes("--detener")) { console.log(detenerApi() ? "API de la demostración detenida." : "No había una API de la demostración corriendo."); return; }
    if (BASE.toLowerCase() === "sigra") { console.error("Por seguridad este script no toca la base SIGRA. Use otro nombre (por defecto SIGRA_demo)."); process.exit(1); }

    console.log(`1/5 Deteniendo la API de la demostración anterior (si la hay)...`);
    detenerApi();
    const ocupante = quienEscucha();
    if (ocupante) { console.error(`El puerto ${PUERTO} lo usa otro proceso (PID ${ocupante}). Detenga esa API y vuelva a ejecutar.`); process.exit(1); }

    const soloIniciar = args.includes("--iniciar");     // volver a levantar la API sin recrear la base ni recargar datos
    if (!soloIniciar) {
        console.log(`2/5 Recreando la base ${BASE} en ${SERVIDOR}...`);
        sqlcmd(`IF DB_ID('${BASE}') IS NOT NULL BEGIN ALTER DATABASE [${BASE}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${BASE}]; END`);
        execFileSync("node", [path.join(__dirname, "Sincronizar-BD.cjs"), "--servidor", SERVIDOR, "--base", BASE, "--crear"], { stdio: "inherit" });
    }

    if (!soloIniciar || !fs.existsSync(path.join(RAIZ, "SIGRA.API", "bin", "Debug", "net8.0", "SIGRA.API.dll"))) {
        console.log("\n3/5 Compilando la API...");
        execFileSync("dotnet", ["build", path.join(RAIZ, "SIGRA.API", "SIGRA.API.csproj"), "-v", "q", "-nologo"], { stdio: "inherit" });
    }

    console.log("\n4/5 Levantando la API sobre la base de demostración...");
    fs.rmSync(CARPETA_API, { recursive: true, force: true });
    fs.cpSync(path.join(RAIZ, "SIGRA.API", "bin", "Debug", "net8.0"), CARPETA_API, { recursive: true });
    fs.rmSync(path.join(CARPETA_API, "appsettings.Local.json"), { force: true });   // si no, ese archivo manda sobre la conexión
    const api = spawn("dotnet", ["SIGRA.API.dll"], {
        cwd: CARPETA_API, detached: true, stdio: "ignore", windowsHide: true,
        env: {
            ...process.env, ASPNETCORE_URLS: `http://localhost:${PUERTO}`, ASPNETCORE_ENVIRONMENT: "Development", ASPNETCORE_CONTENTROOT: CARPETA_API,
            ConnectionStrings__SIGRA: `Data Source=${SERVIDOR};Initial Catalog=${BASE};Integrated Security=True;Encrypt=False`,
            Jwt__Secreto: "llave-de-la-demostracion-sigra-1234567890abcdef",
        },
    });
    api.unref();
    fs.writeFileSync(PID_ARCHIVO, String(api.pid));
    let arriba = false;
    for (let i = 0; i < 40 && !arriba; i++) { await esperar(1000); arriba = await fetch(`http://localhost:${PUERTO}/api/ping`).then(() => true).catch(() => false); }
    if (!arriba) { console.error("La API no respondió a tiempo."); process.exit(1); }

    if (!soloIniciar) {
        console.log("\n5/5 Cargando los datos de demostración...");
        try { execFileSync("node", [path.join(__dirname, "Cargar-DatosDemo.cjs"), "--api", `http://localhost:${PUERTO}/api`], { stdio: "inherit" }); }
        catch { console.error("\nEl cargador terminó con errores: revise el detalle de arriba."); process.exit(1); }
    }

    if (!soloIniciar) {
        // Sin la clave de SendGrid el enlace de la encuesta nunca se ve: se deja la encuesta de la factura FA-2026-0002 con un enlace conocido.
        sqlcmd(`USE [${BASE}]; UPDATE e SET TokenHash = HASHBYTES('SHA2_256', '${TOKEN_ENCUESTA}'), Estado = 'Enviada', FechaExpiracion = DATEADD(DAY, 15, SYSUTCDATETIME()) FROM Encuesta e JOIN Factura f ON f.IdFactura = e.IdFactura WHERE f.NumeroFactura = 'FA-2026-0002'`);
    }

    if (!soloIniciar) {
        // Movimientos de ejemplo para el historial de cambios del CRM (CRMGPSC-026): el administrador los ve desde el primer momento.
        sqlArchivo(`USE [${BASE}];
            INSERT INTO Auditoria (IdUsuario, Modulo, Entidad, IdEntidad, Accion, Fecha, Detalle)
            SELECT v.Autor, 'CRM', v.Entidad, v.IdEntidad, v.Accion, DATEADD(DAY, -v.Dias, GETUTCDATE()), v.Detalle
            FROM (VALUES
                (5, 'Prospecto', 1, 'PROSPECTO_REGISTRADO', 10, N'Se registró el prospecto Transportes Alajuelenses S.A.'),
                (5, 'Seguimiento', 1, 'SEGUIMIENTO_CREADO', 9, N'Seguimiento de tipo Llamada programado para confirmar la cotización.'),
                (5, 'Prospecto', 2, 'PROSPECTO_EDITADO', 6, N'Teléfono: 2654-0022 → 2654-0099'),
                (5, 'Prospecto', 3, 'PROSPECTO_EDITADO', 5, N'Sector: Industria → Construcción. Tamaño de flota: 8 → 12'),
                (5, 'Prospecto', 5, 'PROSPECTO_DESCARTADO', 4, N'Motivo: el cliente eligió otro proveedor.'),
                (1, 'Cliente', 1, 'CLIENTE_EDITADO', 3, N'Sector: Hotelería → Turismo y hotelería'),
                (1, 'Cliente', 1, 'RESPONSABLE_REASIGNADO', 3, N'Responsable: Henry Ortiz → Kimberly Sánchez. Motivo: Henry Ortiz fue desactivado.'),
                (5, 'Prospecto', 5, 'PROSPECTO_REACTIVADO', 2, N'Se reactivó por una nueva solicitud del cliente.'),
                (5, 'ContactoEmpresa', 6, 'CONTACTO_EDITADO', 1, N'Preferencia de contacto: Correo → Teléfono')
            ) v(Autor, Entidad, IdEntidad, Accion, Dias, Detalle)`);
    }

    if (!soloIniciar) {
        // El cargador registra todo hoy: los ingresos a taller y las bajas se reparten en los últimos meses para que la
        // evolución del dashboard muestre una historia creíble en lugar de un salto el último día.
        sqlcmd(`USE [${BASE}]; UPDATE MovimientoInventario SET Fecha = DATEADD(DAY, -(20 + (IdEquipo * 37) % 150), Fecha) WHERE EstadoNuevo IN ('En mantenimiento', 'En reparaci' + NCHAR(243) + 'n', 'En garant' + NCHAR(237) + 'a', 'Dado de baja')`);
    }

    if (!soloIniciar) {
        // Historial de boletas de ejemplo (dos años) y algunas abiertas con antigüedad, para el panel de taller del dashboard.
        sqlArchivo(`USE [${BASE}];
SET NOCOUNT ON;
DECLARE @mes INT = 0, @i INT, @n INT = 100, @id INT, @cliente INT, @empresa NVARCHAR(150), @tec INT, @recibida DATETIME, @cierre DATETIME, @tipo VARCHAR(50), @res VARCHAR(50), @estado VARCHAR(30), @dias INT;
DECLARE @clientes TABLE (Pos INT IDENTITY(0,1), IdCliente INT, Empresa NVARCHAR(150));
INSERT @clientes (IdCliente, Empresa) SELECT IdCliente, Empresa FROM Cliente ORDER BY IdCliente;
DECLARE @total INT = (SELECT COUNT(*) FROM @clientes);
WHILE @mes < 24
BEGIN
    SET @i = 0;
    WHILE @i < (CASE WHEN @mes < 12 THEN 3 + (@mes * 5) % 4 ELSE 2 + (@mes * 3) % 3 END)
    BEGIN
        SET @n += 1;
        SELECT @cliente = IdCliente, @empresa = Empresa FROM @clientes WHERE Pos = @n % @total;
        SET @tec = CASE WHEN @n % 5 < 3 THEN 4 ELSE 7 END;
        SET @tipo = CASE WHEN @n % 3 = 0 THEN 'Mantenimiento preventivo' ELSE N'Reparación' END;
        SET @res = CASE WHEN @n % 7 = 0 THEN 'No reparado' WHEN @n % 11 = 0 THEN N'Garantía' ELSE 'Reparado' END;
        SET @cierre = DATEADD(DAY, -(2 + (@i * 6) % 24), DATEADD(MONTH, -@mes, GETUTCDATE()));
        SET @recibida = DATEADD(DAY, -(2 + @n % 6), @cierre);
        INSERT Ticket (IdCliente, TecnicoReceptor, CodigoSeguimiento, TipoServicio, Estado, FechaRecepcion, DescripcionProblema, Activo)
        VALUES (@cliente, @tec, CONCAT('HIST', @n), @tipo, 'Cerrada', @recibida, 'Boleta de ejemplo del historial', 1);
        SET @id = SCOPE_IDENTITY();
        INSERT TicketGestion (IdTicket, NumeroBoleta, Solicitud, Empresa, Contacto, Telefono, IdUsuarioRegistro, IdTecnicoAsignado, IdTecnicoCierre, FechaAsignacion, FechaInicio, FechaCierre, TrabajoJson)
        VALUES (@id, @n, NEWID(), @empresa, N'Encargado', N'2222-0000', 1, @tec, @tec, @recibida, @recibida, @cierre,
                CASE WHEN @tipo = N'Reparación' THEN CONCAT(N'{"etapa":"Reparado","resolucion":"', @res, N'"}') ELSE N'{}' END);
        INSERT TicketEquipo (IdTicket, Marca, Modelo, Tipo, NumeroSerie, Accesorios, Problema) VALUES (@id, N'Motorola', N'CP200', N'Portátil', CONCAT('HX-', @n), '[]', 'Falla reportada por el cliente');
        IF @tipo = N'Reparación' INSERT Reparacion (IdTicket, TecnicoResponsable, Resolucion, TrabajoRealizado) VALUES (@id, @tec, @res, 'Revisión y reparación');
        INSERT TicketEstadoHistorial (IdTicket, IdUsuario, Estado, FechaInicio, FechaFin) VALUES (@id, @tec, 'Creada', @recibida, @cierre), (@id, @tec, 'Cerrada', @cierre, NULL);
        SET @i += 1;
    END
    SET @mes += 1;
END
-- Abiertas con distinta antigüedad: reparaciones atrasadas, una esperando repuesto y solicitudes sin técnico.
DECLARE @abiertas TABLE (Orden INT, Dias INT, Tipo VARCHAR(50), Estado VARCHAR(30), Tec INT, Espera BIT);
INSERT @abiertas VALUES (1, 16, N'Reparación', 'En proceso', 4, 0), (2, 11, N'Reparación', 'En proceso', 4, 1), (3, 3, N'Reparación', 'Asignada', 7, 0),
    (4, 5, 'Mantenimiento preventivo', 'Asignada', 4, 0), (5, 1, 'Mantenimiento correctivo', 'En proceso', 4, 0), (6, 2, N'Reparación', 'En proceso', 4, 0),
    (7, 4, N'Reparación', 'En proceso', 4, 0), (8, 6, 'Mantenimiento preventivo', 'Creada', NULL, 0), (9, 1, N'Reparación', 'Creada', NULL, 0);
SET @i = 1;
WHILE @i <= (SELECT COUNT(*) FROM @abiertas)
BEGIN
    SET @n += 1;
    SELECT @dias = Dias, @tipo = Tipo, @estado = Estado, @tec = Tec FROM @abiertas WHERE Orden = @i;
    SELECT @cliente = IdCliente, @empresa = Empresa FROM @clientes WHERE Pos = @n % @total;
    SET @recibida = DATEADD(DAY, -@dias, GETUTCDATE());
    INSERT Ticket (IdCliente, TecnicoReceptor, CodigoSeguimiento, TipoServicio, Estado, FechaRecepcion, DescripcionProblema, Activo)
    VALUES (@cliente, @tec, CONCAT('ABIE', @n), @tipo, @estado, @recibida, 'Boleta abierta de ejemplo', 1);
    SET @id = SCOPE_IDENTITY();
    INSERT TicketGestion (IdTicket, NumeroBoleta, Solicitud, Empresa, Contacto, Telefono, IdUsuarioRegistro, IdTecnicoAsignado, FechaAsignacion, TrabajoJson)
    VALUES (@id, @n, NEWID(), @empresa, N'Encargado', N'2222-0000', 1, @tec, CASE WHEN @tec IS NOT NULL THEN @recibida END,
            CASE WHEN @tipo = N'Reparación' AND @estado <> 'Creada' THEN N'{"etapa":"En diagnóstico"}' ELSE N'{}' END);
    INSERT TicketEquipo (IdTicket, Marca, Modelo, Tipo, NumeroSerie, Accesorios, Problema) VALUES (@id, N'Kenwood', N'TK-3170', N'Portátil', CONCAT('HX-', @n), '[]', 'No enciende');
    IF @tipo = N'Reparación' INSERT Reparacion (IdTicket, TecnicoResponsable) VALUES (@id, @tec);
    INSERT TicketEstadoHistorial (IdTicket, IdUsuario, Estado, FechaInicio) VALUES (@id, ISNULL(@tec, 1), @estado, @recibida);
    IF (SELECT Espera FROM @abiertas WHERE Orden = @i) = 1 INSERT TicketEsperaRepuesto (IdTicket, Repuesto, Inicio) VALUES (@id, N'Placa principal', DATEADD(DAY, 1, @recibida));
    SET @i += 1;
END`);
    }

    console.log(`\nListo. La API de la demostración corre en http://localhost:${PUERTO} sobre la base ${BASE}.`);
    console.log("Falta el frontend: en SIGRA-Prototipo ejecute  npm run dev  y abra http://localhost:5173");
    console.log(`Enlace de la encuesta de la factura FA-2026-0002: http://localhost:5173/encuestas/responder/${TOKEN_ENCUESTA}`);
    console.log("Archivos para la demo (PDF firmado e imagen que debe rechazarse): SIGRA-Backend/SIGRA.BD/Demo");
    console.log("Para detener la API:  node Preparar-Demo.cjs --detener");
})();
