import { apiRequest } from "./apiClient";
import { MESES_RECORDATORIO_BATERIA } from "./crmCatalogosService";

function query(params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") usp.set(k, v);
    });
    const text = usp.toString();
    return text ? `?${text}` : "";
}

// ---------- Recordatorios de baterías (CRMGPSC-025) ----------
export const codigoBateria = (id) => `BT-${String(id).padStart(4, "0")}`;

export const ESTADOS_BATERIA = ["Pendiente", "Notificado", "Atendido", "Cerrado"];
export const estaAbierto = (estado) => estado === "Pendiente" || estado === "Notificado";
export const MENSAJE_SIN_RESULTADOS = "No se encontraron recordatorios de baterías con los criterios de búsqueda ingresados.";
export const MENSAJE_SIN_RECORDATORIOS = "Todavía no hay recordatorios de baterías. Registre una compra de batería para programar el aviso de reemplazo.";

// Mismos límites que valida el servidor y la base de datos.
export const LIMITES_BATERIA = { factura: 30, modelo: 150, resultado: 500, observacion: 1000, proximoPaso: 500, cantidadMaxima: 9999 };

export const listarModelosBateria = () => apiRequest("/crm/baterias/modelos");
export const listarBaterias = ({ estado, idVendedor, cliente, desde, hasta } = {}) =>
    apiRequest(`/crm/baterias${query({ estado, idVendedor, cliente, desde, hasta })}`);
export const obtenerBateria = (id) => apiRequest(`/crm/baterias/${id}`);
export const registrarCompraBateria = (datos) => apiRequest("/crm/baterias", { method: "POST", body: datos });
export const atenderBateria = (id, datos) => apiRequest(`/crm/baterias/${id}/atender`, { method: "POST", body: datos });

// ---------- Servicio de recordatorios (T-02) ----------
export const obtenerResumenRecordatorios = () => apiRequest("/crm/recordatorios/resumen");
// Solo el administrador: ejecuta a mano la misma revisión que corre sola cada pocos minutos.
export const procesarRecordatorios = () => apiRequest("/crm/recordatorios/procesar", { method: "POST" });

// ---------- Utilidades ----------
// "Vence hoy" / "Vencido hace 3 días" / "En 12 días". Solo tiene sentido para los recordatorios abiertos.
export function etiquetaVencimiento(dias) {
    if (dias === null || dias === undefined) return "";
    if (dias === 0) return "Vence hoy";
    const n = Math.abs(dias);
    const unidad = n === 1 ? "día" : "días";
    return dias < 0 ? `Vencido hace ${n} ${unidad}` : `En ${n} ${unidad}`;
}

// Suma meses a una fecha "yyyy-MM-dd" igual que lo hace la base de datos (31-dic + 11 meses = 30-nov).
export function sumarMeses(iso, meses = MESES_RECORDATORIO_BATERIA) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
    if (!m) return "";
    const anio = Number(m[1]);
    const mes = Number(m[2]) - 1 + meses;
    const anioFinal = anio + Math.floor(mes / 12);
    const mesFinal = ((mes % 12) + 12) % 12;
    const ultimoDia = new Date(anioFinal, mesFinal + 1, 0).getDate();
    const dia = Math.min(Number(m[3]), ultimoDia);
    return `${anioFinal}-${String(mesFinal + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
