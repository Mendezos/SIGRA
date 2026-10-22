#!/usr/bin/env node
/*
 * Carga los datos de demostración de los módulos del Sprint 2 (Inventario, Alquiler, Frecuencias y Tickets).
 *
 * Usa la propia API del sistema, así que los datos nacen con sus validaciones, estados, bitácoras y auditoría.
 * Se puede ejecutar varias veces: lo que ya existe se omite.
 *
 * Requisitos: la base sincronizada (Sincronizar-BD.cjs), la API corriendo y Node 18 o superior.
 *   node Cargar-DatosDemo.cjs                       (API en http://localhost:5044/api)
 *   node Cargar-DatosDemo.cjs --api http://localhost:5044/api --solo tickets
 *
 * Etapas: inventario, contratos, baterias, repetidoras, contactos, frecuencias, tickets, stock
 * Usa las cuentas de prueba que documenta LEEME.md.
 */

const argumentos = process.argv.slice(2);
const opcion = (nombre, porDefecto) => {
    const i = argumentos.indexOf(`--${nombre}`);
    return i >= 0 ? argumentos[i + 1] : porDefecto;
};
const API = opcion("api", process.env.SIGRA_API ?? "http://localhost:5044/api");
const SOLO = opcion("solo", "").split(",").map((s) => s.trim()).filter(Boolean);
const corre = (etapa) => SOLO.length === 0 || SOLO.includes(etapa);

const CUENTAS = {
    admin: ["admin@radifaxcr.com", "Admin#2026"],
    coordinador: ["maria.ceciliano@radifaxcr.com", "Coord#2026"],
    ricardo: ["ricardo.infante@radifaxcr.com", "RadifaxCR2026"],
    tomas: ["tomas.diaz@radifaxcr.com", "RadifaxCR2026"],
    vendedor: ["kimberly.sanchez@radifaxcr.com", "Ventas#2026"],
    recepcion: ["recepcion@radifaxcr.com", "Ventas#2026"],
};

// ---------- Utilidades ----------
const sesiones = {};
async function cabeceras(rol, json = true) {
    if (!sesiones[rol]) {
        const [correo, password] = CUENTAS[rol];
        const r = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ correo, password }) });
        const j = await r.json().catch(() => ({}));
        if (!j.token) throw new Error(`No se pudo iniciar sesión como ${rol} (${r.status}): ${j.mensaje ?? ""}`);
        sesiones[rol] = j.token;
    }
    return json ? { Authorization: `Bearer ${sesiones[rol]}`, "Content-Type": "application/json" } : { Authorization: `Bearer ${sesiones[rol]}` };
}

async function llamar(rol, metodo, ruta, cuerpo) {
    const formulario = typeof FormData !== "undefined" && cuerpo instanceof FormData;
    const r = await fetch(`${API}${ruta}`, {
        method: metodo,
        headers: await cabeceras(rol, !formulario),
        body: cuerpo === undefined ? undefined : formulario ? cuerpo : JSON.stringify(cuerpo),
    });
    const texto = await r.text();
    let datos = null;
    try { datos = texto ? JSON.parse(texto) : null; } catch { datos = texto; }
    if (!r.ok) {
        const detalle = datos?.mensaje ?? datos?.title ?? (typeof datos === "string" ? datos : "");
        const errores = datos?.errores?.length ? ` (${datos.errores.join("; ")})` : "";
        const error = new Error(`${metodo} ${ruta} -> ${r.status} ${detalle}${errores}`);
        error.estado = r.status;
        error.datos = datos;
        throw error;
    }
    return datos;
}

const hoy = new Date();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dias = (n) => { const d = new Date(hoy); d.setDate(d.getDate() + n); return iso(d); };
// hace `a` años y `m` meses, más `d` días (puede ser negativo)
const hace = ({ a = 0, m = 0, d = 0 }) => { const f = new Date(hoy); f.setFullYear(f.getFullYear() - a); f.setMonth(f.getMonth() - m); f.setDate(f.getDate() + d); return iso(f); };

const resumen = { creado: 0, omitido: 0, fallo: 0 };
const fallos = [];
async function paso(descripcion, accion) {
    try {
        const r = await accion();
        if (r === "omitido") { resumen.omitido += 1; console.log(`  · ${descripcion} (ya existía)`); }
        else { resumen.creado += 1; console.log(`  ✔ ${descripcion}`); }
        return r;
    } catch (e) {
        resumen.fallo += 1;
        fallos.push(`${descripcion}: ${e.message}`);
        console.log(`  ✖ ${descripcion}\n      ${e.message}`);
        return null;
    }
}
const titulo = (t) => console.log(`\n== ${t}`);

// Archivos de ejemplo (PDF y PNG mínimos válidos) para los documentos adjuntos
const PDF = (texto) => Buffer.from(`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length ${texto.length + 40}>>stream\nBT /F1 14 Tf 20 60 Td (${texto}) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF`);
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const archivo = (buffer, nombre, tipo) => new File([buffer], nombre, { type: tipo });

// ---------- Datos ----------
const PROVEEDOR = { Motorola: 2, Kenwood: 3 };
const CATEGORIA = { portatil: 2, movil: 3, repetidora: 4 };

const EQUIPOS = [
    ...[1, 2, 3, 4, 5, 6].map((n) => ({ serie: `SN-6100${n}`, cat: CATEGORIA.portatil, marca: "Motorola", modelo: "CP200", desc: "Radio portátil analógico UHF, 16 canales", costo: 145000 })),
    ...[1, 2, 3, 4, 5, 6].map((n) => ({ serie: `SN-6200${n}`, cat: CATEGORIA.portatil, marca: "Kenwood", modelo: "TK-3170", desc: "Radio portátil UHF 400-470 MHz, 16 canales", costo: 132000 })),
    ...[1, 2, 3].map((n) => ({ serie: `SN-6300${n}`, cat: CATEGORIA.portatil, marca: "Kenwood", modelo: "TK-3401", desc: "Radio portátil UHF, 4 W, resistente al agua", costo: 158000 })),
    ...[1, 2, 3, 4, 5, 6].map((n) => ({ serie: `SN-6400${n}`, cat: CATEGORIA.movil, marca: "Motorola", modelo: "DGM4100", desc: "Radio móvil digital para vehículo, pantalla a color", costo: 295000 })),
    ...[1, 2, 3, 4, 5, 6].map((n) => ({ serie: `SN-7800${n}`, cat: CATEGORIA.repetidora, marca: "Motorola", modelo: "SLR 1000", desc: "Repetidora UHF de 40 W con duplexor integrado", costo: 1450000 })),
];

// Contratos de alquiler: cada uno pensado para mostrar un estado o escenario distinto
const CONTRATOS = [
    {
        clave: "taxis", empresa: "Cooperativa de Taxis Escazú", inicio: "2026-06-01", vence: "2027-06-01", monto: 180000, cubre: true,
        series: ["SN-64001", "SN-64002", "SN-64003", "SN-64004", "SN-64005"], accesorios: [],
        condiciones: "Cinco radios móviles instalados en vehículos de la cooperativa. Incluye cobertura de reparaciones.",
    },
    {
        clave: "atlas", empresa: "Seguridad Atlas S.A.", inicio: "2025-11-01", vence: dias(60), monto: 240000, cubre: false,
        series: ["SN-62001", "SN-62002", "SN-62003", "SN-62004", "SN-78005"], accesorios: [["Kenwood TK-3170", "Audífono con micrófono", 4], ["Kenwood TK-3170", "Cargador de escritorio", 2]],
        condiciones: "Cuatro radios portátiles para oficiales de seguridad y una repetidora de enlace. Vence pronto: sirve para probar la renovación.",
    },
    {
        clave: "tamarindo", empresa: "Hacienda Tamarindo", inicio: hace({ m: 11, d: -5 }), vence: dias(20), monto: 95000, cubre: false,
        series: ["SN-63001", "SN-63002", "SN-78003"], accesorios: [["Kenwood TK-3401", "Antena UHF", 2]],
        condiciones: "Radios y repetidora para la hacienda. Está por vencer en menos de 30 días.",
    },
    {
        clave: "clinica", empresa: "Clínica Santa Fe", inicio: "2025-01-10", vence: dias(-12), monto: 110000, cubre: false,
        series: ["SN-62005", "SN-78004"], accesorios: [],
        condiciones: "Contrato que ya venció: sirve para ver el estado Vencido y la renovación de un contrato vencido.",
    },
    {
        clave: "mirador", empresa: "Restaurante El Mirador", inicio: "2025-11-05", vence: dias(25), monto: 70000, cubre: true,
        series: ["SN-61001", "SN-61002"], accesorios: [["Motorola CP200", "Cargador de escritorio", 2], ["Motorola CP200", "Clip de cinturón", 2]],
        condiciones: "Dos radios portátiles para el personal del restaurante. Se renueva en esta carga para mostrar el estado Renovado.",
        renovar: { nuevaFechaVencimiento: dias(390), nuevoMonto: 76000, observacion: "Renovación por un año con ajuste del 8 %." },
    },
    {
        clave: "marina", empresa: "Marina Pez Vela", inicio: "2026-03-01", vence: "2027-03-01", monto: 60000, cubre: false,
        series: ["SN-61005", "SN-61006"], accesorios: [],
        condiciones: "Contrato que se cancela en esta carga para mostrar el estado Cancelado.",
        cancelar: "El cliente cerró la operación en la marina y devolvió los equipos.",
    },
    {
        clave: "heredia", empresa: "Municipalidad de Heredia", inicio: "2026-08-01", vence: "2028-08-01", monto: 420000, cubre: true,
        series: ["SN-78001", "SN-78002"], accesorios: [],
        condiciones: "Dos repetidoras para la red de comunicaciones de la policía municipal. Incluye reparaciones.",
    },
];

// Cambios de batería (cada radio con una situación distinta). 11 meses es el ciclo.
const BATERIAS = [
    { serie: "SN-62001", batería: "BAT-62001-A", fecha: "2025-11-20" }, // vencida
    { serie: "SN-62002", batería: "BAT-62002-A", fecha: hace({ m: 10, d: -12 }) }, // próxima a vencer
    { serie: "SN-62003", batería: "BAT-62003-A", fecha: hace({ m: 1 }) }, // buena
    { serie: "SN-61001", batería: "BAT-61001-A", fecha: "2025-11-10" }, // vencida
    { serie: "SN-61002", batería: "BAT-61002-A", fecha: hace({ m: 3 }) }, // buena
    { serie: "SN-63001", batería: "BAT-63001-A", fecha: hace({ m: 10, d: -20 }) }, // próxima a vencer
];

const FICHAS = [
    { serie: "SN-78001", frecuencia: "450.125 MHz", rx: "455.125 MHz", potencia: "40 W", accesorios: "Duplexor, antena colineal 6 dB, 30 m de cable coaxial", direccion: "Cerro Tures, San Rafael de Heredia, torre municipal", gps: "9.998400, -84.117300", clasificacion: "Alquilada por Radifax", checklist: "completo", docs: true },
    { serie: "SN-78002", frecuencia: "460.250 MHz", rx: "465.250 MHz", potencia: "25 W", accesorios: "Duplexor, antena direccional", direccion: "Palacio Municipal de Heredia, azotea", gps: "9.998100, -84.117000", clasificacion: "Propia del cliente", checklist: "incompleto" },
    { serie: "SN-78003", frecuencia: "155.340 MHz", rx: "159.340 MHz", potencia: "35 W", accesorios: "Duplexor, antena omnidireccional", direccion: "Mirador de Hacienda Tamarindo, Santa Cruz, Guanacaste", gps: "10.299500, -85.837900", clasificacion: "Alquilada por Radifax" },
    { serie: "SN-78004", frecuencia: "453.500 MHz", rx: "458.500 MHz", potencia: "30 W", accesorios: "Duplexor y gabinete", direccion: "Clínica Santa Fe, Santa Ana, azotea del edificio B", gps: "9.932900, -84.182600", clasificacion: "Alquilada por Radifax", checklist: "completo" },
    { serie: "SN-77003", frecuencia: "450.125 MHz", rx: "455.125 MHz", potencia: "40 W", accesorios: "Duplexor, antena colineal 6 dB", direccion: "Estación Central de Bomberos, San José, torre de comunicaciones", gps: "9.934100, -84.087700", clasificacion: "Alquilada por Radifax", normalizar: true },
];

const CONTACTOS = [
    { empresa: "Taller y Repuestos Alajuela", contacto: "Esteban Quesada", medio: "Teléfono", dato: "8845-1122", motivo: "Alquiler de seis radios portátiles para el personal del taller." },
    { empresa: "Constructora Pacífico", contacto: "Lucía Vargas", medio: "Correo", dato: "lvargas@constructorapacifico.example", motivo: "Cotización de una repetidora para una obra en Guanacaste." },
    { empresa: "Hotel Los Sueños", contacto: "Carolina Vega", medio: "Teléfono", dato: "2222-1111", motivo: "Ampliar el contrato con dos radios más (cliente con vendedor previo)." },
    { empresa: "Distribuidora Monteverde", contacto: "Andrés Mora", medio: "Correo", dato: "amora@monteverde.example", motivo: "Radios para la flotilla de reparto de la distribuidora." },
];

// Solicitudes de frecuencia: una por estado
const FRECUENCIAS = [
    { clave: "heredia-nueva", cliente: "Municipalidad de Heredia", serie: "SN-78001", frecuencia: "450.125 MHz", banda: "UHF", potencia: "40 W", zona: "Heredia, San Rafael y Santo Domingo", presentada: hace({ d: -20 }) },
    { clave: "heredia-vigente", cliente: "Municipalidad de Heredia", serie: "SN-78002", frecuencia: "460.250 MHz", banda: "UHF", potencia: "25 W", zona: "Casco central de Heredia", presentada: hace({ a: 1, m: 1 }), otorgada: hace({ a: 1 }), resolucion: "MICITT-DCNT-2025-0381" },
    { clave: "tamarindo-renovar", cliente: "Hacienda Tamarindo", serie: "SN-78003", frecuencia: "155.340 MHz", banda: "VHF", potencia: "35 W", zona: "Tamarindo, Santa Cruz y Nicoya", presentada: hace({ a: 5, d: 80 - 30 }), otorgada: hace({ a: 5, d: 80 }), resolucion: "MICITT-DCNT-2021-0147", renovacion: true },
    { clave: "atlas-urgente", cliente: "Seguridad Atlas S.A.", serie: "SN-78005", frecuencia: "453.800 MHz", banda: "UHF", potencia: "30 W", zona: "Gran Área Metropolitana", presentada: hace({ a: 5, d: 18 - 30 }), otorgada: hace({ a: 5, d: 18 }), resolucion: "MICITT-DCNT-2021-0092" },
    { clave: "clinica-vencida", cliente: "Clínica Santa Fe", serie: "SN-78004", frecuencia: "453.500 MHz", banda: "UHF", potencia: "30 W", zona: "Santa Ana y Escazú", presentada: hace({ a: 5, d: -70 }), otorgada: hace({ a: 5, d: -40 }), resolucion: "MICITT-DCNT-2021-0033" },
    { clave: "bomberos-cancelada", cliente: "Bomberos de Costa Rica", serie: "SN-77003", frecuencia: "151.725 MHz", banda: "VHF", potencia: "40 W", zona: "Región Central", presentada: hace({ d: -45 }), cancelar: "La institución desistió del trámite porque cambió de frecuencia de operación." },
];

// Boletas de servicio técnico: una por situación del flujo
const BOLETAS = [
    {
        clave: "preventivo-creada", cliente: "Seguridad Atlas S.A.", servicio: "Mantenimiento preventivo", contacto: "Roberto Alvarado", tel: "2290-1010", correo: "operaciones@seguridadatlas.example",
        equipos: [{ marca: "Kenwood", modelo: "TK-3170", serie: "SN-62003", tipo: "Portátil", acc: ["Antena", "Cargador"], problema: "Revisión periódica trimestral de los radios del turno diurno." }],
        hasta: "creada",
    },
    {
        clave: "reparacion-asignada", cliente: "Cooperativa de Taxis Escazú", servicio: "Reparación", contacto: "Mónica Salazar", tel: "2228-4040", correo: "gerencia@taxisescazu.example",
        equipos: [{ marca: "Motorola", modelo: "DGM4100", serie: "SN-64002", tipo: "Móvil", acc: ["Otros"], problema: "El radio no enciende al arrancar el vehículo; el fusible está bien." }],
        hasta: "asignada", tecnico: "tomas",
    },
    {
        clave: "reparacion-proceso", cliente: "Cooperativa de Taxis Escazú", servicio: "Reparación", contacto: "Mónica Salazar", tel: "2228-4040", correo: "gerencia@taxisescazu.example",
        equipos: [{ marca: "Motorola", modelo: "DGM4100", serie: "SN-64003", tipo: "Móvil", acc: ["Antena"], problema: "Se escucha entrecortado y la pantalla se apaga sola." }],
        hasta: "proceso", tecnico: "ricardo", trabajo: { hallazgos: "Conector de antena flojo y oxidado.", detalles: "Se desarmó el equipo y se limpiaron los contactos.", etapa: "En diagnóstico" },
    },
    {
        clave: "reparado-cubierto", cliente: "Restaurante El Mirador", servicio: "Reparación", contacto: "Valeria Chinchilla", tel: "2441-5566", correo: "admin@elmirador.example",
        equipos: [{ marca: "Motorola", modelo: "CP200", serie: "SN-61002", tipo: "Portátil", acc: ["Cargador"], problema: "La batería no retiene carga y el botón PTT falla de forma intermitente." }],
        hasta: "cerrada", tecnico: "ricardo", resolucion: "Reparado", trabajo: { hallazgos: "Botón PTT desgastado.", acciones: "Se cambió el botón PTT y se probó en sitio.", detalles: "Cambio de botón y prueba de transmisión.", etapa: "Reparado" },
    },
    {
        clave: "no-reparado", cliente: "Seguridad Atlas S.A.", servicio: "Reparación", contacto: "Roberto Alvarado", tel: "2290-1010", correo: "operaciones@seguridadatlas.example",
        equipos: [{ marca: "Kenwood", modelo: "TK-3170", serie: "SN-62002", tipo: "Portátil", acc: ["Antena"], problema: "El equipo cayó al agua y no responde en ningún canal." }],
        hasta: "cerrada", tecnico: "tomas", resolucion: "No reparado", trabajo: { hallazgos: "Placa principal con corrosión severa por humedad.", acciones: "Diagnóstico completo en banco de pruebas.", detalles: "Revisión de placa y pruebas de continuidad.", etapa: "En diagnóstico", justificacion: "La placa principal tiene corrosión que afecta varias capas; el costo de reparación supera el valor del equipo." },
    },
    {
        clave: "garantia", cliente: "Hacienda Tamarindo", servicio: "Reparación", contacto: "Ignacio Rojas", tel: "2653-7788", correo: "contacto@haciendatamarindo.example",
        equipos: [{ marca: "Kenwood", modelo: "TK-3401", serie: "SN-63002", tipo: "Portátil", acc: ["Batería", "Cargador"], problema: "El equipo apenas tiene un mes de uso y el audio salió distorsionado." }],
        hasta: "cerrada", tecnico: "ricardo", resolucion: "Garantía", trabajo: { hallazgos: "Falla de fábrica en el amplificador de audio.", acciones: "Se envió el equipo al proveedor para cambio por garantía.", detalles: "Pruebas de audio y diagnóstico.", etapa: "En diagnóstico", proveedor: "Kenwood Latinoamérica", caso: "KW-2026-0412" },
    },
    {
        clave: "repetidora-bitacora", cliente: "Municipalidad de Heredia", servicio: "Mantenimiento correctivo", contacto: "Ing. Rebeca Soto", tel: "2237-6000", correo: "radiocomunicaciones@heredia.example",
        equipos: [{ marca: "Motorola", modelo: "SLR 1000", serie: "SN-78001", tipo: "Repetidora", acc: ["Antena", "Otros"], problema: "Potencia de salida baja; se sospecha del cable coaxial o del duplexor." }],
        hasta: "cerrada", tecnico: "ricardo", resolucion: "Reparado", trabajo: { hallazgos: "Conector N del cable coaxial con humedad.", acciones: "Se reemplazó el conector y se selló con cinta autofundente.", detalles: "Medición de potencia antes y después del cambio.", etapa: "Reparado" },
    },
    {
        clave: "cancelada", cliente: "Clínica Santa Fe", servicio: "Mantenimiento preventivo", contacto: "Dra. Paula Jiménez", tel: "2282-3300", correo: "ti@clinicasantafe.example",
        equipos: [{ marca: "Kenwood", modelo: "TK-3170", serie: "SN-62005", tipo: "Portátil", acc: ["Cargador"], problema: "Revisión general solicitada por la administración de la clínica." }],
        hasta: "cancelada", motivo: "El cliente pospuso el mantenimiento hasta el próximo mes.",
    },
];

// ---------- Etapas ----------
let equiposPorSerie = null;
async function equipos() {
    equiposPorSerie = Object.fromEntries((await llamar("admin", "GET", "/inventario/equipos")).map((e) => [e.numeroSerie, e]));
    return equiposPorSerie;
}

async function etapaInventario() {
    titulo("Inventario: equipos");
    await equipos();
    for (const e of EQUIPOS) {
        await paso(`${e.serie} · ${e.marca} ${e.modelo}`, async () => {
            if (equiposPorSerie[e.serie]) return "omitido";
            await llamar("admin", "POST", "/inventario/equipos", {
                idCategoria: e.cat, marca: e.marca, modelo: e.modelo, descripcionTecnica: e.desc, numeroSerie: e.serie,
                idProveedor: PROVEEDOR[e.marca], propietario: "Radifax", ubicacion: "Bodega San José",
                fechaAdquisicion: "2026-02-10", costoCompra: e.costo,
            });
        });
    }
    await equipos();
}

async function etapaContratos() {
    titulo("Alquiler: contratos");
    await equipos();
    const catalogo = await llamar("vendedor", "GET", "/inventario/accesorios");
    const idAccesorio = (modelo, nombre) => catalogo.find((a) => a.modelo === modelo && a.nombre === nombre)?.id;
    for (const c of CONTRATOS) {
        const lista = await llamar("vendedor", "GET", "/alquiler/contratos");
        let existente = lista.find((x) => x.empresa === c.empresa && String(x.fechaInicio).startsWith(c.inicio));
        await paso(`Contrato de ${c.empresa}`, async () => {
            if (existente) return "omitido";
            const accesorios = c.accesorios.map(([m, n, cant]) => ({ idAccesorioModelo: idAccesorio(m, n), cantidad: cant }));
            if (accesorios.some((a) => !a.idAccesorioModelo)) throw new Error("No se encontró un accesorio del catálogo");
            const r = await llamar("vendedor", "POST", "/alquiler/contratos", {
                empresa: c.empresa, fechaInicio: c.inicio, fechaVencimiento: c.vence, montoMensual: c.monto,
                condiciones: c.condiciones, cubreReparaciones: c.cubre, series: c.series, accesorios,
            });
            existente = r.contrato;
        });
        if (!existente) existente = (await llamar("vendedor", "GET", "/alquiler/contratos")).find((x) => x.empresa === c.empresa && String(x.fechaInicio).startsWith(c.inicio));
        if (!existente) continue;
        if (c.renovar) {
            await paso(`Renovar el contrato de ${c.empresa}`, async () => {
                const det = await llamar("vendedor", "GET", `/alquiler/contratos/${existente.idContrato}`);
                if (det.contrato.estadoRegistrado === "Renovado" || String(det.contrato.fechaVencimiento).startsWith(c.renovar.nuevaFechaVencimiento)) return "omitido";
                await llamar("vendedor", "POST", `/alquiler/contratos/${existente.idContrato}/renovar`, c.renovar);
            });
        }
        if (c.cancelar) {
            await paso(`Cancelar el contrato de ${c.empresa}`, async () => {
                const det = await llamar("vendedor", "GET", `/alquiler/contratos/${existente.idContrato}`);
                if (det.contrato.estadoRegistrado === "Cancelado") return "omitido";
                await llamar("admin", "POST", `/alquiler/contratos/${existente.idContrato}/cancelar`, { motivo: c.cancelar });
            });
        }
    }
    await equipos();
}

async function etapaBaterias() {
    titulo("Alquiler: baterías de los radios");
    await equipos();
    for (const b of BATERIAS) {
        await paso(`${b.serie} · batería cambiada el ${b.fecha}`, async () => {
            const eq = equiposPorSerie[b.serie];
            if (!eq) throw new Error("El equipo no existe");
            const historial = await llamar("admin", "GET", `/alquiler/radios/${eq.idEquipo}/baterias`);
            if (historial.length > 0) return "omitido";
            await llamar("admin", "POST", "/alquiler/radios/bateria", { idEquipo: eq.idEquipo, numeroSerieBateria: b.batería, fechaCambio: b.fecha });
        });
    }
}

async function etapaRepetidoras() {
    titulo("Alquiler: repetidoras (ficha, checklist y documentos)");
    const requisitos = (await llamar("admin", "GET", "/alquiler/repetidoras/SN-77003/checklist")).requisitos.map((r) => r.idRequisito);
    for (const f of FICHAS) {
        const datos = {
            numeroSerie: f.serie, modelo: "SLR 1000", frecuencia: f.frecuencia, frecuenciaRecepcion: f.rx, potencia: f.potencia,
            accesorios: f.accesorios, direccionInstalacion: f.direccion, coordenadasGPS: f.gps, clasificacion: f.clasificacion,
        };
        await paso(`${f.serie} · ficha técnica`, async () => {
            const rep = (await llamar("admin", "GET", "/alquiler/repetidoras")).find((r) => r.numeroSerie === f.serie);
            if (!rep) throw new Error("La repetidora no está en un contrato de alquiler");
            if (rep.tieneFicha) {
                if (!f.normalizar || rep.accesorios === f.accesorios) return "omitido";
                await llamar("admin", "PUT", "/alquiler/repetidoras/ficha", datos);
                return;
            }
            await llamar("admin", "POST", "/alquiler/repetidoras/ficha", datos);
        });
        if (f.checklist) {
            await paso(`${f.serie} · checklist ${f.checklist}`, async () => {
                const actual = await llamar("admin", "GET", `/alquiler/repetidoras/${f.serie}/checklist`);
                if (actual.repetidora.estadoChecklist !== "Sin checklist") return "omitido";
                const cumplidos = f.checklist === "completo" ? requisitos : requisitos.slice(0, requisitos.length - 2);
                await llamar("admin", "POST", `/alquiler/repetidoras/${f.serie}/checklist`, {
                    cumplidos,
                    observaciones: f.checklist === "completo" ? "Todos los requisitos verificados en sitio." : "Falta confirmar la frecuencia autorizada y la prueba en taller.",
                });
            });
        }
        if (f.docs) {
            await paso(`${f.serie} · documentos técnicos`, async () => {
                const existentes = await llamar("admin", "GET", `/alquiler/repetidoras/${f.serie}/documentos`);
                if (existentes.length > 0) return "omitido";
                const subir = async (buffer, nombre, tipoArchivo, tipoDocumento, nombreDocumento) => {
                    const form = new FormData();
                    form.append("Archivo", archivo(buffer, nombre, tipoArchivo));
                    form.append("TipoDocumento", tipoDocumento);
                    form.append("NombreDocumento", nombreDocumento);
                    await llamar("admin", "POST", `/alquiler/repetidoras/${f.serie}/documentos`, form);
                };
                await subir(PDF("Plano de instalacion - Cerro Tures"), "plano-instalacion.pdf", "application/pdf", "Plano", "Plano de instalación");
                await subir(PNG, "acta-instalacion.png", "image/png", "Acta de instalación", "Acta de instalación firmada");
            });
        }
    }
}

async function etapaContactos() {
    titulo("Alquiler: contactos iniciales (recepcionista)");
    for (const c of CONTACTOS) {
        await paso(`${c.empresa} · ${c.contacto}`, async () => {
            const lista = await llamar("recepcion", "GET", "/alquiler/contactos");
            if (lista.some((x) => x.empresa === c.empresa && x.contacto === c.contacto)) return "omitido";
            await llamar("recepcion", "POST", "/alquiler/contactos", {
                empresa: c.empresa, contacto: c.contacto, medioContacto: c.medio, datoContacto: c.dato, motivo: c.motivo, confirmarDuplicado: true,
            });
        });
    }
}

async function etapaFrecuencias() {
    titulo("Frecuencias de radio");
    const clientes = await llamar("admin", "GET", "/frecuencias/clientes");
    const ids = {};
    for (const f of FRECUENCIAS) {
        const cliente = clientes.find((c) => c.empresa === f.cliente);
        await paso(`${f.cliente} · ${f.serie} · ${f.frecuencia}`, async () => {
            if (!cliente) throw new Error("El cliente no existe");
            const lista = await llamar("admin", "GET", "/frecuencias/solicitudes");
            const previa = lista.find((s) => s.empresa === f.cliente && s.numeroSerie === f.serie && s.frecuencia === f.frecuencia && !s.idSolicitudOrigen);
            if (previa) { ids[f.clave] = previa.idSolicitud; return "omitido"; }
            const repetidoras = await llamar("admin", "GET", `/frecuencias/clientes/${cliente.idCliente}/repetidoras`);
            const rep = repetidoras.find((r) => r.numeroSerie === f.serie);
            if (!rep) throw new Error("La repetidora no está asociada a un contrato de este cliente");
            const form = new FormData();
            form.append("IdCliente", String(cliente.idCliente));
            form.append("IdEquipo", String(rep.idEquipo));
            form.append("Frecuencia", f.frecuencia);
            form.append("Banda", f.banda);
            form.append("Potencia", f.potencia);
            form.append("ZonaCobertura", f.zona);
            form.append("FechaPresentacion", f.presentada);
            form.append("Formularios", archivo(PDF("Formulario de solicitud de frecuencia"), "formulario-solicitud.pdf", "application/pdf"));
            form.append("Acuses", archivo(PDF("Acuse de recibo del tramite"), "acuse-recibo.pdf", "application/pdf"));
            const r = await llamar("vendedor", "POST", "/frecuencias/solicitudes", form);
            ids[f.clave] = r.idSolicitud ?? r.solicitud?.idSolicitud;
        });
        const id = ids[f.clave];
        if (!id) continue;
        if (f.otorgada) {
            await paso(`  otorgamiento de ${f.clave}`, async () => {
                const s = await llamar("admin", "GET", `/frecuencias/solicitudes/${id}`);
                if (s.estado !== "En solicitud") return "omitido";
                await llamar("vendedor", "POST", `/frecuencias/solicitudes/${id}/otorgamiento`, { fechaOtorgamiento: f.otorgada, numeroResolucion: f.resolucion });
            });
        }
        if (f.cancelar) {
            await paso(`  cancelación de ${f.clave}`, async () => {
                const s = await llamar("admin", "GET", `/frecuencias/solicitudes/${id}`);
                if (s.estado === "Cancelada") return "omitido";
                await llamar("vendedor", "POST", `/frecuencias/solicitudes/${id}/cancelacion`, { motivo: f.cancelar });
            });
        }
    }
    // Renovación en curso de la frecuencia de Hacienda Tamarindo
    const origen = ids["tamarindo-renovar"];
    if (origen) {
        await paso("Renovación de la frecuencia de Hacienda Tamarindo", async () => {
            const lista = await llamar("admin", "GET", "/frecuencias/solicitudes");
            if (lista.some((s) => s.idSolicitudOrigen === origen)) return "omitido";
            const o = await llamar("admin", "GET", `/frecuencias/solicitudes/${origen}`);
            const form = new FormData();
            form.append("IdCliente", String(o.idCliente));
            form.append("IdEquipo", String(o.idEquipo));
            form.append("IdSolicitudOrigen", String(origen));
            form.append("Frecuencia", o.frecuencia);
            form.append("Banda", o.banda);
            form.append("Potencia", o.potencia);
            form.append("ZonaCobertura", o.zonaCobertura);
            form.append("FechaPresentacion", dias(-5));
            form.append("Formularios", archivo(PDF("Formulario de renovacion"), "formulario-renovacion.pdf", "application/pdf"));
            form.append("Acuses", archivo(PDF("Acuse de recibo de la renovacion"), "acuse-renovacion.pdf", "application/pdf"));
            await llamar("vendedor", "POST", "/frecuencias/solicitudes", form);
        });
    }
    await paso("Generar las alertas de vencimiento", async () => {
        await llamar("admin", "POST", "/frecuencias/alertas/verificar");
    });
}

async function etapaTickets() {
    titulo("Tickets de servicio técnico");
    const clientesTickets = await llamar("recepcion", "GET", "/tickets/clientes");
    const tecnicos = await llamar("admin", "GET", "/tickets/tecnicos");
    const idTecnico = { ricardo: tecnicos.find((t) => t.nombre.startsWith("Ricardo"))?.idUsuario, tomas: tecnicos.find((t) => t.nombre.startsWith("Tomas"))?.idUsuario };
    const rolPorId = { [idTecnico.ricardo]: "ricardo", [idTecnico.tomas]: "tomas" };

    await paso("Especialidades de los técnicos", async () => {
        if (tecnicos.every((t) => t.especialidades.length > 0)) return "omitido";
        await llamar("admin", "PUT", `/tickets/tecnicos/${idTecnico.ricardo}/especialidades`, { especialidades: ["Radios", "Repetidoras"] });
        await llamar("admin", "PUT", `/tickets/tecnicos/${idTecnico.tomas}/especialidades`, { especialidades: ["Radios"] });
    });

    const ver = (id) => llamar("admin", "GET", `/tickets/${id}`);
    const version = async (id) => (await ver(id)).version;

    for (const b of BOLETAS) {
        await paso(`Boleta ${b.clave} · ${b.cliente}`, async () => {
            let hizoAlgo = false;
            const serie = b.equipos[0].serie;
            const previas = await llamar("admin", "GET", `/tickets?Pagina=1&TamanoPagina=20&IncluirInactivos=true&Texto=${encodeURIComponent(serie)}`);
            let t;
            if ((previas.items ?? []).length > 0) {
                t = await ver(previas.items[0].idTicket);
            } else {
                const cliente = clientesTickets.find((c) => c.empresa === b.cliente);
                t = await llamar("recepcion", "POST", "/tickets", {
                    solicitud: crypto.randomUUID(), idCliente: cliente?.idCliente, empresa: b.cliente, contacto: b.contacto, telefono: b.tel,
                    correo: b.correo, tipoServicio: b.servicio, confirmarAlquilerOtroCliente: true,
                    equipos: b.equipos.map((e) => ({
                        marca: e.marca, modelo: e.modelo, tipo: e.tipo, especialidad: e.tipo === "Repetidora" ? "Repetidoras" : "Radios",
                        numeroSerie: e.serie, accesorios: e.acc, problema: e.problema,
                    })),
                });
                t = await ver(t.idTicket);
                hizoAlgo = true;
            }
            const id = t.idTicket;
            if (["Cerrada", "Cancelada"].includes(t.estado)) return hizoAlgo ? undefined : "omitido";

            if (b.hasta === "cancelada") {
                await llamar("recepcion", "POST", `/tickets/${id}/cancelar`, { version: t.version, motivo: b.motivo });
                return;
            }
            if (b.hasta === "creada") return hizoAlgo ? undefined : "omitido";

            // Las reparaciones se asignan solas por especialidad y carga; el resto lo asigna la coordinadora.
            if (!t.idTecnicoAsignado) {
                await llamar("coordinador", "POST", `/tickets/${id}/asignacion`, { version: t.version, idTecnico: idTecnico[b.tecnico], confirmarSobrecarga: true, fechaEstimada: dias(5) });
                hizoAlgo = true;
                t = await ver(id);
            }
            const tecnico = rolPorId[t.idTecnicoAsignado];
            if (!tecnico) throw new Error("La boleta quedó asignada a un técnico que el cargador no conoce");
            if (b.hasta === "asignada") return hizoAlgo ? undefined : "omitido";

            if (!t.fechaRecepcionFisica) {
                await llamar(tecnico, "POST", `/tickets/${id}/recepcion-fisica`, { version: t.version });
                hizoAlgo = true;
                t = await ver(id);
            }
            if (t.estado === "Asignada") {
                await llamar(tecnico, "POST", `/tickets/${id}/iniciar`, { version: t.version });
                hizoAlgo = true;
                t = await ver(id);
            }

            const trabajo = (extra = {}) => ({
                servicioRealizado: b.servicio, detallesTrabajo: b.trabajo?.detalles ?? "Revisión y pruebas del equipo.", observaciones: null,
                hallazgos: b.trabajo?.hallazgos ?? null, acciones: b.trabajo?.acciones ?? null, etapa: b.trabajo?.etapa ?? "En diagnóstico",
                repuesto: null, resolucion: null, tieneCobro: false, numeroFactura: null, monto: null,
                justificacionTecnica: b.trabajo?.justificacion ?? null, proveedor: b.trabajo?.proveedor ?? null, casoProveedor: b.trabajo?.caso ?? null, ...extra,
            });
            if (b.hasta === "proceso") {
                if (!t.trabajo?.hallazgos) {
                    await llamar(tecnico, "PUT", `/tickets/${id}/trabajo`, { version: t.version, trabajo: trabajo() });
                    hizoAlgo = true;
                }
                return hizoAlgo ? undefined : "omitido";
            }

            // Mantenimiento: el técnico lo deriva a reparación antes de cerrarlo con una resolución
            if (b.servicio !== "Reparación" && !t.esReparacion) {
                await llamar(tecnico, "POST", `/tickets/${id}/derivar-reparacion`, { version: t.version });
                t = await ver(id);
                const nueva = (await llamar("admin", "GET", `/tickets?Pagina=1&TamanoPagina=20&IncluirInactivos=true&Texto=${encodeURIComponent(serie)}`)).items;
                t = await ver(nueva.find((x) => x.estado !== "Cerrada")?.idTicket ?? id);
            }
            await llamar(tecnico, "POST", `/tickets/${t.idTicket}/cerrar`, {
                version: t.version,
                trabajo: trabajo({ resolucion: b.resolucion, etapa: b.resolucion === "Reparado" ? "Reparado" : b.trabajo?.etapa ?? "En diagnóstico" }),
            });
        });
    }
}

async function etapaStock() {
    titulo("Inventario: stock mínimo y movimientos");
    await equipos();
    const categorias = await llamar("admin", "GET", "/inventario/stock/categorias");
    const minimos = { "Radio móvil": 2, "Repetidora": 1, "Radio portátil": 5 };
    for (const [nombre, minimo] of Object.entries(minimos)) {
        await paso(`Stock mínimo de ${nombre}: ${minimo}`, async () => {
            const c = categorias.find((x) => x.categoria === nombre);
            if (!c) throw new Error("La categoría no existe");
            if (c.cantidadMinima === minimo) return "omitido";
            await llamar("admin", "PUT", `/inventario/stock/categorias/${c.idCategoria}/minimo`, { cantidadMinima: minimo });
        });
    }
    const antena = equiposPorSerie["LT-ANT-01"];
    if (antena) {
        const marcadoEn = async (marca) => (await llamar("admin", "GET", `/inventario/movimientos?idEquipo=${antena.idEquipo}`)).some((m) => (m.observacion ?? "").includes(marca));
        await paso("Entrada de 10 antenas (compra)", async () => {
            if (await marcadoEn("[demo-compra]")) return "omitido";
            await llamar("admin", "POST", "/inventario/movimientos/entrada", { idEquipo: antena.idEquipo, tipoMovimiento: "Compra", cantidad: 10, observacion: "Compra a Distribuidora Tecnológica CR [demo-compra]" });
        });
        await paso("Salida de 1 antena (pérdida)", async () => {
            if (await marcadoEn("[demo-perdida]")) return "omitido";
            await llamar("admin", "POST", "/inventario/movimientos/salida", { idEquipo: antena.idEquipo, tipoMovimiento: "Pérdida", cantidad: 1, observacion: "Antena extraviada durante una visita técnica [demo-perdida]" });
        });
    }
    // Un equipo dado de baja con motivo y otro en mantenimiento, para mostrar los demás estados
    const baja = equiposPorSerie["SN-61006"];
    await paso("SN-61006 · dado de baja con motivo", async () => {
        const eq = (await equipos())["SN-61006"];
        if (!eq || eq.estado === "Dado de baja") return "omitido";
        if (eq.estado !== "Disponible") return "omitido";
        await llamar("admin", "PATCH", `/inventario/equipos/${eq.idEquipo}/estado`, { estado: "Dado de baja", motivo: "Daño irreparable en la carcasa y la placa por una caída." });
    });
    void baja;
}

// ---------- Ejecución ----------
(async () => {
    console.log(`Cargando datos de demostración en ${API}`);
    try {
        const ping = await fetch(`${API}/ping`).catch(() => null);
        if (!ping) throw new Error("No se pudo conectar con la API. Inicie la API antes de ejecutar este script.");
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }

    const etapas = [
        ["inventario", etapaInventario], ["contratos", etapaContratos], ["baterias", etapaBaterias], ["repetidoras", etapaRepetidoras],
        ["contactos", etapaContactos], ["frecuencias", etapaFrecuencias], ["tickets", etapaTickets], ["stock", etapaStock],
    ];
    for (const [nombre, funcion] of etapas) {
        if (!corre(nombre)) continue;
        try { await funcion(); } catch (e) { resumen.fallo += 1; fallos.push(`${nombre}: ${e.message}`); console.log(`  ✖ Etapa ${nombre}: ${e.message}`); }
    }

    console.log(`\nResumen: ${resumen.creado} creado(s), ${resumen.omitido} ya existían, ${resumen.fallo} con error.`);
    if (fallos.length) { console.log("\nErrores:"); fallos.forEach((f) => console.log(" - " + f)); process.exitCode = 1; }
})();
