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

    console.log(`\nListo. La API de la demostración corre en http://localhost:${PUERTO} sobre la base ${BASE}.`);
    console.log("Falta el frontend: en SIGRA-Prototipo ejecute  npm run dev  y abra http://localhost:5173");
    console.log(`Enlace de la encuesta de la factura FA-2026-0002: http://localhost:5173/encuestas/responder/${TOKEN_ENCUESTA}`);
    console.log("Archivos para la demo (PDF firmado e imagen que debe rechazarse): SIGRA-Backend/SIGRA.BD/Demo");
    console.log("Para detener la API:  node Preparar-Demo.cjs --detener");
})();
