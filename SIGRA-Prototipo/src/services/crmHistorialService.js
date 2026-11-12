import { apiRequest } from "./apiClient";

function query(params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") usp.set(k, v);
    });
    const text = usp.toString();
    return text ? `?${text}` : "";
}

// ---------- Notas, interacciones e historial comercial (CRMGPSC-013 y 014) ----------
// Las fechas y horas de las interacciones son hora de Costa Rica y viajan SIN zona horaria ("2026-11-12T14:30:00").
export const registrarInteraccion = (datos) => apiRequest("/crm/interacciones", { method: "POST", body: datos });
export const registrarNota = (datos) => apiRequest("/crm/notas", { method: "POST", body: datos });
export const listarCotizacionesDeEmpresa = (tipoEmpresa, idEmpresa) =>
    apiRequest(`/crm/interacciones/cotizaciones${query({ tipoEmpresa, idEmpresa })}`);
export const obtenerHistorial = ({ tipoEmpresa, idEmpresa, tipoMovimiento, desde, hasta, idAutor }) =>
    apiRequest(`/crm/historial${query({ tipoEmpresa, idEmpresa, tipoMovimiento, desde, hasta, idAutor })}`);

// ---------- Mensajes (los mismos que devuelve el servidor, para avisar antes de enviar) ----------
export const MENSAJE_SIN_ACTIVIDAD = "La empresa no tiene actividad comercial registrada";
export const MENSAJE_SIN_COINCIDENCIAS = "No hay movimientos que coincidan con los filtros aplicados.";
export const MENSAJE_FECHA_FUTURA = "La fecha de la interacción no puede ser futura. Si es una actividad por hacer, programe un seguimiento.";
export const MENSAJE_RANGO_INVALIDO = "La fecha inicial no puede ser posterior a la final";
export const MENSAJE_INTERACCION_INCOMPLETA = "Debe completar los campos obligatorios para registrar la interacción.";
export const MENSAJE_NOTA_INCOMPLETA = "Debe completar los campos obligatorios para registrar la nota.";

// ---------- Límites (los mismos que las columnas de la base de datos y que valida el servidor) ----------
export const MAX_DESCRIPCION = 2000;
export const MAX_RESULTADO = 500;
export const MAX_PROXIMO_PASO = 500;
export const MAX_TEXTO_NOTA = 2000;

// ---------- Movimientos del historial ----------
export const MOVIMIENTO_INTERACCION = "Interacción";
export const MOVIMIENTO_NOTA = "Nota";
export const MOVIMIENTO_COTIZACION = "Cotización";
export const TIPOS_MOVIMIENTO = [MOVIMIENTO_INTERACCION, MOVIMIENTO_NOTA, MOVIMIENTO_COTIZACION];

export const FILTROS_HISTORIAL_VACIOS = { tipoMovimiento: "", desde: "", hasta: "", idAutor: "" };
export const hayFiltrosHistorial = (f) => Object.values(f).some((v) => String(v) !== "");

const rellenar = (prefijo, id) => `${prefijo}-${String(id).padStart(4, "0")}`;
export const codigoInteraccion = (id) => rellenar("IN", id);
export const codigoNota = (id) => rellenar("NT", id);
export const codigoCotizacion = (id) => rellenar("COT", id);

export function codigoMovimiento(movimiento) {
    if (movimiento.tipoMovimiento === MOVIMIENTO_INTERACCION) return codigoInteraccion(movimiento.idMovimiento);
    if (movimiento.tipoMovimiento === MOVIMIENTO_NOTA) return codigoNota(movimiento.idMovimiento);
    return codigoCotizacion(movimiento.idMovimiento);
}

export function montoCotizacion(monto, moneda) {
    if (monto === null || monto === undefined) return "";
    return new Intl.NumberFormat("es-CR", { style: "currency", currency: moneda || "CRC", minimumFractionDigits: 2 }).format(monto);
}

// Texto del movimiento en la línea de tiempo: las cotizaciones no traen descripción propia, se arma con sus datos.
export function descripcionMovimiento(movimiento) {
    if (movimiento.tipoMovimiento === MOVIMIENTO_COTIZACION) {
        return `Cotización ${codigoCotizacion(movimiento.idMovimiento)} · ${movimiento.estadoCotizacion ?? ""} · ${montoCotizacion(movimiento.monto, movimiento.moneda)}`;
    }
    return movimiento.descripcion ?? "";
}
