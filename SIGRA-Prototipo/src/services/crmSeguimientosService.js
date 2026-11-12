import { apiRequest } from "./apiClient";

function query(params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "" && v !== false) usp.set(k, v);
    });
    const text = usp.toString();
    return text ? `?${text}` : "";
}

// ---------- Códigos que se muestran al usuario ----------
export const codigoSeguimiento = (id) => `SG-${String(id).padStart(4, "0")}`;
export const codigoSerie = (id) => `SC-${String(id).padStart(4, "0")}`;

// ---------- Mensajes (los mismos que devuelve el servidor, para avisar antes de enviar) ----------
export const MENSAJE_SIN_SEGUIMIENTOS = "No hay seguimientos programados en el período seleccionado";
export const MENSAJE_SIN_SERIES = "Todavía no hay contactos periódicos programados.";
export const MENSAJE_SIN_SERIES_FILTRADAS = "No hay contactos periódicos que coincidan con los filtros.";
export const MENSAJE_FECHA_HORA_INVALIDA = "La fecha u hora ingresada no es válida; inserte una fecha y hora futuras.";
export const MENSAJE_FECHA_HORA_PASADA = "La fecha y hora del seguimiento ya pasaron; inserte una fecha y hora futuras.";
export const MENSAJE_FALTANTES_SEGUIMIENTO = "Debe completar los campos obligatorios para programar el seguimiento.";
export const MENSAJE_FALTANTES_REPROGRAMAR = "Debe completar los campos obligatorios para reprogramar el seguimiento.";
export const MENSAJE_FALTANTES_SERIE = "Debe completar los campos obligatorios para programar el contacto periódico.";
export const MENSAJE_SIN_RESULTADO = "Debe registrar el resultado del seguimiento para completarlo.";
export const MENSAJE_SIN_MOTIVO_CANCELACION = "Debe indicar el motivo de la cancelación.";
export const MENSAJE_SIN_MOTIVO_CANCELACION_SERIE = "Debe indicar el motivo de la cancelación de la serie.";
export const MENSAJE_FECHA_REAL_FUTURA = "La fecha real no puede ser futura.";
export const MENSAJE_SERIE_FECHA_ANTERIOR = "La fecha inicial es anterior a la fecha actual; corrija la fecha.";
export const MENSAJE_SERIE_FECHA_HORA_PASADA = "La fecha y hora iniciales ya pasaron; corrija la fecha o la hora.";

// Longitudes máximas (las mismas de las columnas de la base de datos)
export const MAX_MOTIVO = 500;
export const MAX_RESULTADO = 500;
export const MAX_OBSERVACIONES = 1000;
export const MAX_PROXIMO_PASO = 500;

// ---------- Agenda ----------
export const ESTADOS_FILTRO_AGENDA = [
    { value: "Abiertos", label: "Abiertos (pendientes y atrasados)" },
    { value: "Pendiente", label: "Pendiente" },
    { value: "Atrasado", label: "Atrasado" },
    { value: "Completado", label: "Completado" },
    { value: "Cancelado", label: "Cancelado" },
    { value: "Todos", label: "Todos los estados" },
];

// filtros: { desde, hasta, prioridad, tipo, estado, idResponsable ("" = todos), texto }
export const listarAgenda = (f = {}) =>
    apiRequest(
        `/crm/seguimientos${query({
            desde: f.desde,
            hasta: f.hasta,
            sinRango: !f.desde && !f.hasta,
            prioridad: f.prioridad,
            tipo: f.tipo,
            estado: f.estado,
            idResponsable: f.idResponsable,
            todosResponsables: !f.idResponsable,
            texto: f.texto?.trim(),
        })}`
    );
export const obtenerSeguimiento = (id) => apiRequest(`/crm/seguimientos/${id}`);
export const crearSeguimiento = (datos) => apiRequest("/crm/seguimientos", { method: "POST", body: datos });
export const reprogramarSeguimiento = (id, datos) => apiRequest(`/crm/seguimientos/${id}/reprogramar`, { method: "PUT", body: datos });
export const completarSeguimiento = (id, datos) => apiRequest(`/crm/seguimientos/${id}/completar`, { method: "PUT", body: datos });
export const cancelarSeguimiento = (id, datos) => apiRequest(`/crm/seguimientos/${id}/cancelar`, { method: "PUT", body: datos });

// ---------- Contactos periódicos ----------
export const ESTADOS_FILTRO_SERIES = [
    { value: "Activa", label: "Activas" },
    { value: "Cancelada", label: "Canceladas" },
    { value: "Todas", label: "Todas" },
];
export const listarSeries = (f = {}) =>
    apiRequest(`/crm/series${query({ estado: f.estado, idResponsable: f.idResponsable, texto: f.texto?.trim() })}`);
export const obtenerSerie = (id) => apiRequest(`/crm/series/${id}`);
export const crearSerie = (datos) => apiRequest("/crm/series", { method: "POST", body: datos });
export const cancelarSerie = (id, datos) => apiRequest(`/crm/series/${id}/cancelar`, { method: "POST", body: datos });

// ---------- Roles ----------
const quitarTildes = (texto = "") => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const esVendedorCrm = (user) => quitarTildes(user?.role) === "vendedor / ejecutivo de cuenta";
export const esAdministradorCrm = (user) => quitarTildes(user?.role) === "administrador del sistema";

// Quien puede cerrar o reprogramar un seguimiento: su responsable o el administrador (el servidor lo vuelve a validar).
export const esResponsableOAdmin = (user, idResponsable) => esAdministradorCrm(user) || user?.idUsuario === idResponsable;

export const estaAbierto = (seguimiento) => seguimiento.estado === "Pendiente" || seguimiento.estado === "Atrasado";

// ---------- Fechas ----------
const dos = (n) => String(n).padStart(2, "0");

// "yyyy-MM-dd" + n días (en fecha local, sin pasar por UTC).
export function sumarDias(iso, dias) {
    const [a, m, d] = iso.split("-").map(Number);
    const f = new Date(a, m - 1, d + dias);
    return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`;
}

// Tiempo transcurrido desde que venció un seguimiento: "hace 2 días 3 h", "hace 3 h 10 min", "hace 45 min".
export function textoTranscurrido(minutos) {
    if (minutos === null || minutos === undefined) return "";
    const total = Math.max(0, Math.round(minutos));
    const dias = Math.floor(total / 1440);
    const horas = Math.floor((total % 1440) / 60);
    const mins = total % 60;
    if (dias > 0) return `hace ${dias} ${dias === 1 ? "día" : "días"}${horas ? ` ${horas} h` : ""}`;
    if (horas > 0) return `hace ${horas} h${mins ? ` ${mins} min` : ""}`;
    return `hace ${Math.max(1, mins)} min`;
}

const MESES_POR_PERIODICIDAD = { Mensual: 1, Trimestral: 3, Semestral: 6 };
const OCURRENCIAS_POR_PERIODICIDAD = { Mensual: 12, Trimestral: 4, Semestral: 2 };

// Fechas que generará el servidor para una serie (misma regla: desde la fecha inicial, sin "arrastrar" el día 31, durante 12 meses).
export function fechasDeSerie(fechaInicial, periodicidad) {
    const paso = MESES_POR_PERIODICIDAD[periodicidad];
    const cantidad = OCURRENCIAS_POR_PERIODICIDAD[periodicidad];
    if (!paso || !/^\d{4}-\d{2}-\d{2}$/.test(fechaInicial ?? "")) return [];
    const [a, m, d] = fechaInicial.split("-").map(Number);
    return Array.from({ length: cantidad }, (_, i) => {
        const destino = new Date(a, m - 1 + i * paso, 1);
        const ultimoDia = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
        return `${destino.getFullYear()}-${dos(destino.getMonth() + 1)}-${dos(Math.min(d, ultimoDia))}`;
    });
}

// ¿Existe de verdad la fecha "yyyy-MM-dd"? (los navegadores devuelven "" para fechas inexistentes, pero se valida igual).
export function fechaExiste(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
    if (!m) return false;
    const f = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return f.getFullYear() === Number(m[1]) && f.getMonth() === Number(m[2]) - 1 && f.getDate() === Number(m[3]);
}
export const horaExiste = (hora) => /^([01]\d|2[0-3]):[0-5]\d$/.test(hora ?? "");
