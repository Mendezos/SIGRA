import { tienePermiso } from "../inventario/helpers";

export { colones, fechaCorta, fechaHora, hoyISO, tienePermiso } from "../inventario/helpers";

export const MODULO_CRM = 9;

// Lo que cada rol puede hacer sale de "Roles y permisos" (Lectura, Escritura, Edición, Eliminación) del módulo CRM.
export const puedeVerCrm = (user) => tienePermiso(user, MODULO_CRM, "lectura");
export const puedeCrearCrm = (user) => tienePermiso(user, MODULO_CRM, "escritura");
export const puedeEditarCrm = (user) => tienePermiso(user, MODULO_CRM, "edicion");
export const puedeEliminarCrm = (user) => tienePermiso(user, MODULO_CRM, "eliminacion");

// ---------- Fechas y horas ----------
// Las fechas y horas que el usuario programa en el CRM (seguimientos, interacciones, recordatorios) son "hora de pared" de
// Costa Rica y el servidor las devuelve SIN zona horaria ("2026-11-12T14:30:00"). Por eso NO se pasan por formatearFechaHora
// (que asume UTC y las correría 6 horas): se leen tal cual con estas funciones.
// Las marcas de tiempo del sistema (fecha de creación, de cierre...) sí llegan en UTC y se muestran con
// formatearFechaHora de utils/format.js.
const PATRON = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;

export function fechaLocal(valor, vacio = "Sin registro") {
    const m = PATRON.exec(String(valor ?? ""));
    if (!m) return vacio;
    return `${m[3]}/${m[2]}/${m[1]}`;
}

export function horaLocal(valor, vacio = "") {
    const m = PATRON.exec(String(valor ?? ""));
    if (!m || m[4] === undefined) return vacio;
    const h = Number(m[4]);
    return `${String(((h + 11) % 12) + 1).padStart(2, "0")}:${m[5]} ${h < 12 ? "a. m." : "p. m."}`;
}

export function fechaHoraLocal(valor, vacio = "Sin registro") {
    const fecha = fechaLocal(valor, "");
    if (!fecha) return vacio;
    const hora = horaLocal(valor);
    return hora ? `${fecha} ${hora}` : fecha;
}

// Valor para <input type="datetime-local"> (yyyy-MM-ddTHH:mm) a partir de lo que devuelve el servidor.
export const aInputFechaHora = (valor) => (PATRON.test(String(valor ?? "")) ? String(valor).slice(0, 16) : "");

// Ahora mismo en el navegador, con el formato de <input type="datetime-local"> (hora local, no UTC).
export function ahoraInputFechaHora(minutosExtra = 0) {
    const d = new Date(Date.now() + minutosExtra * 60000);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// "hace 2 días 3 h" / "en 45 min" entre un momento local del servidor y ahora (para marcar lo atrasado).
export function distanciaDesdeAhora(valor) {
    const m = PATRON.exec(String(valor ?? ""));
    if (!m) return "";
    const objetivo = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0));
    const minutos = Math.round((objetivo.getTime() - Date.now()) / 60000);
    const abs = Math.abs(minutos);
    const dias = Math.floor(abs / 1440);
    const horas = Math.floor((abs % 1440) / 60);
    const mins = abs % 60;
    const partes = dias > 0 ? `${dias} ${dias === 1 ? "día" : "días"}${horas ? ` ${horas} h` : ""}` : horas > 0 ? `${horas} h${mins ? ` ${mins} min` : ""}` : `${mins} min`;
    return minutos < 0 ? `hace ${partes}` : `en ${partes}`;
}
