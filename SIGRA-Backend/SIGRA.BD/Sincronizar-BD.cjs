#!/usr/bin/env node
/**
 * Sincronizar-BD.cjs
 *
 * Deja una base de datos SIGRA igual a lo que define el repositorio (tablas, columnas, restricciones,
 * vistas, triggers, procedimientos, migraciones y datos iniciales), sin necesidad de SSDT.
 * Es seguro correrlo varias veces: solo agrega o corrige lo que falta o difiere.
 *
 * Uso (desde la carpeta SIGRA-Backend/SIGRA.BD):
 *   node Sincronizar-BD.cjs                                  -> localhost, base SIGRA
 *   node Sincronizar-BD.cjs --servidor "localhost\SQLEXPRESS"
 *   node Sincronizar-BD.cjs --servidor "localhost\SQLEXPRESS" --base SIGRA --crear
 *   node Sincronizar-BD.cjs --sin-semillas                   -> no ejecuta Script.PostDeployment.sql
 *
 * Requiere: Node.js y sqlcmd (los mismos que ya se usan en el proyecto). Autenticación de Windows.
 *
 * Qué NO hace: no borra tablas ni columnas que ya no existan en el repositorio, y nunca vuelve NOT NULL
 * una columna que ya tiene datos.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

// ---------- argumentos ----------
const args = process.argv.slice(2);
const valorDe = (nombre, defecto) => {
    const i = args.indexOf(nombre);
    return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : defecto;
};
const SERVIDOR = valorDe("--servidor", "localhost");
const BASE = valorDe("--base", "SIGRA");
const CREAR = args.includes("--crear");
const SEMILLAS = !args.includes("--sin-semillas");

const RAIZ = __dirname + path.sep;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "sigra-bd-"));

// ---------- utilidades ----------
function sqlcmd(extra, { base = BASE, tolerante = false } = {}) {
    const argumentos = ["-S", SERVIDOR, "-d", base, "-E", "-I", "-f", "65001", "-C"];
    if (!tolerante) argumentos.push("-b");
    try {
        const salida = execFileSync("sqlcmd", [...argumentos, ...extra], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
        const errores = salida.split(/\r?\n/).filter((l) => /^(Msg|Mensaje) \d+, (Level|Nivel) (1[1-9]|2\d)/.test(l));
        return { ok: errores.length === 0, salida, errores };
    } catch (e) {
        return { ok: false, salida: (e.stdout || "") + (e.stderr || ""), errores: [String(e.stdout || e.stderr || e.message).trim().split(/\r?\n/)[0]] };
    }
}
const consulta = (texto) => sqlcmd(["-h", "-1", "-W", "-s", "|", "-Q", `SET NOCOUNT ON; ${texto}`]).salida.trim();
const sinBom = (ruta) => {
    const destino = path.join(TMP, path.basename(ruta));
    fs.writeFileSync(destino, fs.readFileSync(ruta, "utf8").replace(/^﻿/, ""));
    return destino;
};
const sqlFiles = (dir) => (fs.existsSync(RAIZ + dir) ? fs.readdirSync(RAIZ + dir).filter((f) => f.toLowerCase().endsWith(".sql")).sort().map((f) => RAIZ + dir + "/" + f) : []);
const nombre = (ruta) => path.basename(ruta, ".sql");
const titulo = (t) => console.log(`\n== ${t}`);

const resumen = { tablas: 0, columnas: 0, ajustes: 0, vistas: 0, triggers: 0, sp: 0, migraciones: 0, errores: [] };

// ---------- 0) base de datos ----------
titulo(`Servidor ${SERVIDOR}, base ${BASE}`);
const probe = sqlcmd(["-Q", "SELECT 1"], { base: "master" });
if (!probe.ok) {
    console.error("No se pudo conectar al servidor. Revise --servidor.\n" + probe.salida.trim().slice(0, 300));
    process.exit(2);
}
const existeBase = sqlcmd(["-h", "-1", "-W", "-Q", `SET NOCOUNT ON; SELECT ISNULL(DB_ID(N'${BASE}'), 0)`], { base: "master" }).salida.trim().split(/\r?\n/).pop();
if (existeBase === "0") {
    if (!CREAR) {
        console.error(`La base ${BASE} no existe. Use --crear para crearla.`);
        process.exit(2);
    }
    const c = sqlcmd(["-Q", `CREATE DATABASE [${BASE}]`], { base: "master" });
    if (!c.ok) {
        console.error("No se pudo crear la base: " + c.salida.slice(0, 300));
        process.exit(2);
    }
    console.log(`Base ${BASE} creada.`);
}

// ---------- 1) tablas que faltan (varias pasadas por el orden de las llaves foráneas) ----------
titulo("Tablas");
const existentes = new Set(consulta("SELECT name FROM sys.tables").split(/\r?\n/).map((s) => s.trim().toLowerCase()).filter(Boolean));
let pendientes = sqlFiles("dbo/Tables").filter((f) => !existentes.has(nombre(f).toLowerCase()));
for (let pasada = 0; pasada < 8 && pendientes.length; pasada++) {
    const siguientes = [];
    for (const f of pendientes) {
        const r = sqlcmd(["-i", sinBom(f)]);
        if (r.ok) { resumen.tablas++; existentes.add(nombre(f).toLowerCase()); }
        else siguientes.push(f);
    }
    if (siguientes.length === pendientes.length) break;
    pendientes = siguientes;
}
pendientes.forEach((f) => resumen.errores.push(`tabla ${nombre(f)} no se pudo crear`));
console.log(`creadas: ${resumen.tablas}`);

// ---------- 2) columnas, tipos, nulos y restricciones CHECK ----------
titulo("Columnas y restricciones");
const REGEX_COLUMNA = /^\s*\[(\w+)\]\s+\[?(\w+)\]?\s*(\(\s*(\d+|MAX)\s*(?:,\s*\d+)?\s*\))?\s*(.*?),?\s*$/i;
const vivas = new Map();
consulta(`SELECT t.name, c.name, ty.name, c.max_length, c.is_nullable, c.is_identity
          FROM sys.columns c JOIN sys.tables t ON t.object_id = c.object_id JOIN sys.types ty ON ty.user_type_id = c.user_type_id`)
    .split(/\r?\n/).filter(Boolean).forEach((l) => {
        const [t, c, ty, ml, nul, idn] = l.split("|");
        vivas.set(`${t}.${c}`.toLowerCase(), { tipo: ty, ml: +ml, nul: nul === "1", idn: idn === "1" });
    });

for (const archivo of sqlFiles("dbo/Tables")) {
    const tabla = nombre(archivo);
    const lineas = fs.readFileSync(archivo, "utf8").replace(/^﻿/, "").split(/\r?\n/);
    for (const l of lineas) {
        if (/^\s*CONSTRAINT/i.test(l) || /^\s*(CREATE|\)|GO|ON\b)/i.test(l)) continue;
        const m = l.match(REGEX_COLUMNA);
        if (!m) continue;
        const [, col, tipo, , largo, resto] = m;
        const tipoSql = `${tipo}${m[3] ? m[3].replace(/\s+/g, "") : ""}`;
        const llave = `${tabla}.${col}`.toLowerCase();
        const viva = vivas.get(llave);
        const definicion = resto.replace(/IDENTITY\s*\([^)]*\)/i, "").trim();

        if (!viva) {
            if (!existentes.has(tabla.toLowerCase())) continue;
            // Columna nueva: si es NOT NULL sin valor por omisión se agrega como NULL para no fallar con filas existentes.
            let r = sqlcmd(["-Q", `ALTER TABLE dbo.[${tabla}] ADD [${col}] ${tipoSql} ${definicion}`]);
            if (!r.ok) r = sqlcmd(["-Q", `ALTER TABLE dbo.[${tabla}] ADD [${col}] ${tipoSql} ${definicion.replace(/NOT\s+NULL/i, "NULL")}`]);
            if (r.ok) resumen.columnas++;
            else resumen.errores.push(`columna ${tabla}.${col}: ${r.errores[0] ?? ""}`);
            continue;
        }
        if (viva.idn) continue;

        // Texto más largo en el repositorio
        if (/^n?(var)?char$/i.test(tipo) && largo) {
            const repo = largo.toUpperCase() === "MAX" ? -1 : +largo;
            const actual = /^n/i.test(viva.tipo) && viva.ml > 0 ? viva.ml / 2 : viva.ml;
            if (repo === -1 || (repo > actual && actual !== -1)) {
                if (repo !== actual) {
                    const r = sqlcmd(["-Q", `ALTER TABLE dbo.[${tabla}] ALTER COLUMN [${col}] ${tipo}(${largo}) ${viva.nul ? "NULL" : "NOT NULL"}`]);
                    if (r.ok) resumen.ajustes++;
                    else resumen.errores.push(`longitud ${tabla}.${col}: ${r.errores[0] ?? ""}`);
                }
            }
        }

        // El repositorio la permite nula y la base no: se relaja (lo contrario nunca se fuerza)
        const repoNulo = !/NOT\s+NULL/i.test(resto);
        if (repoNulo && !viva.nul) {
            const r = sqlcmd(["-Q", `ALTER TABLE dbo.[${tabla}] ALTER COLUMN [${col}] ${tipoSql} NULL`]);
            if (r.ok) resumen.ajustes++;
            else resumen.errores.push(`nulos ${tabla}.${col}: ${r.errores[0] ?? ""}`);
        }
    }
}

// Restricciones CHECK: se alinean con las definidas en los archivos.
const normalizar = (s) => s.replace(/[\s\[\]()]/g, "").replace(/N'/g, "'").toLowerCase();
// Dos restricciones son equivalentes si usan los mismos textos entre comillas (IN (...) frente a OR),
// o, cuando no tienen textos, si su definición normalizada es igual.
const literales = (s) => [...s.matchAll(/'([^']*)'/g)].map((m) => m[1].toLowerCase()).sort().join("|");
const equivalentes = (a, b) => {
    const la = literales(a);
    const lb = literales(b);
    return la || lb ? la === lb : normalizar(a) === normalizar(b);
};
const checksVivos = consulta("SELECT OBJECT_NAME(parent_object_id), name, definition FROM sys.check_constraints")
    .split(/\r?\n/).filter(Boolean).map((l) => { const [tabla, nom, def] = l.split("|"); return { tabla, nom, def }; });
for (const archivo of sqlFiles("dbo/Tables")) {
    const tabla = nombre(archivo);
    if (!existentes.has(tabla.toLowerCase())) continue;
    const texto = fs.readFileSync(archivo, "utf8").replace(/^﻿/, "");
    const enRepo = [...texto.matchAll(/CONSTRAINT\s+\[(\w+)\]\s+CHECK\s*(\([^\n]*\))\s*,?\s*(?:\r?\n|$)/gi)].map((m) => ({ nom: m[1], expr: m[2].replace(/,\s*$/, "") }));
    const enVivo = checksVivos.filter((c) => c.tabla.toLowerCase() === tabla.toLowerCase());
    for (const v of enVivo) {
        if (!enRepo.some((r) => r.nom.toLowerCase() === v.nom.toLowerCase())) {
            const r = sqlcmd(["-Q", `ALTER TABLE dbo.[${tabla}] DROP CONSTRAINT [${v.nom}]`]);
            if (r.ok) resumen.ajustes++;
        }
    }
    for (const r of enRepo) {
        const v = enVivo.find((x) => x.nom.toLowerCase() === r.nom.toLowerCase());
        if (v && equivalentes(v.def, r.expr)) continue;
        if (v) sqlcmd(["-Q", `ALTER TABLE dbo.[${tabla}] DROP CONSTRAINT [${v.nom}]`]);
        const res = sqlcmd(["-Q", `ALTER TABLE dbo.[${tabla}] WITH CHECK ADD CONSTRAINT [${r.nom}] CHECK ${r.expr}`]);
        if (res.ok) resumen.ajustes++;
        else resumen.errores.push(`check ${tabla}.${r.nom}: ${res.errores[0] ?? ""}`);
    }
}
console.log(`columnas agregadas: ${resumen.columnas}, ajustes: ${resumen.ajustes}`);

// ---------- 3) migraciones (scripts idempotentes de cada historia) ----------
titulo("Migraciones");
const migraciones = [...sqlFiles("Migraciones"), ...sqlFiles("Migraciones/RCFR")];
for (const f of migraciones) {
    const r = sqlcmd(["-i", sinBom(f)], { tolerante: true });
    if (r.ok) resumen.migraciones++;
    else resumen.errores.push(`migración ${path.basename(f)}: ${r.errores[0] ?? ""}`);
}
console.log(`aplicadas: ${resumen.migraciones} de ${migraciones.length}`);

// ---------- 4) vistas, triggers y procedimientos ----------
titulo("Vistas, triggers y procedimientos");
function recrear(dir, tipo, codigo, contador) {
    for (const f of sqlFiles(dir)) {
        const nom = nombre(f);
        sqlcmd(["-Q", `IF OBJECT_ID(N'dbo.${nom}', N'${codigo}') IS NOT NULL DROP ${tipo} dbo.[${nom}]`]);
        const r = sqlcmd(["-i", sinBom(f)]);
        if (r.ok) resumen[contador]++;
        else resumen.errores.push(`${tipo.toLowerCase()} ${nom}: ${r.errores[0] ?? ""}`);
    }
}
recrear("dbo/Views", "VIEW", "V", "vistas");
recrear("dbo/Triggers", "TRIGGER", "TR", "triggers");
recrear("dbo/Stored Procedures", "PROCEDURE", "P", "sp");
console.log(`vistas: ${resumen.vistas}, triggers: ${resumen.triggers}, procedimientos: ${resumen.sp}`);

// ---------- 5) datos iniciales ----------
if (SEMILLAS) {
    titulo("Datos iniciales (Script.PostDeployment.sql)");
    const r = sqlcmd(["-i", sinBom(RAIZ + "Script.PostDeployment.sql")], { tolerante: true });
    if (r.ok) console.log("aplicados");
    else {
        console.log("aplicados con avisos");
        r.errores.slice(0, 5).forEach((e) => resumen.errores.push("semillas: " + e));
    }
}

// ---------- resultado ----------
titulo("Resultado");
console.log(JSON.stringify({ ...resumen, errores: resumen.errores.length }, null, 2));
if (resumen.errores.length) {
    console.log("\nAvisos/errores:");
    resumen.errores.forEach((e) => console.log("  - " + e));
}
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(resumen.errores.length ? 1 : 0);
