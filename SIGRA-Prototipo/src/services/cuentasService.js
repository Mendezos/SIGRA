import { apiRequest } from "./apiClient";

function aQuery(filtros) {
    const query = new URLSearchParams();

    Object.entries(filtros).forEach(([key, value]) => {
        if (value !== "" && value != null) {
            query.set(key, String(value));
        }
    });

    return query.toString();
}

// Devuelve { items, total, pagina, tamanoPagina }.
export const listarCuentas = (filtros = {}) => apiRequest(`/cuentas?${aQuery(filtros)}`);
export const listarRoles = () => apiRequest("/cuentas/roles");
export const obtenerResumen = () => apiRequest("/cuentas/resumen");
export const listarOpcionesCuentas = () => apiRequest("/cuentas/opciones");

export const crearCuenta = (body) =>
    apiRequest("/cuentas", { method: "POST", body });

export const editarCuenta = (id, body) =>
    apiRequest(`/cuentas/${id}`, { method: "PUT", body });

export const cambiarEstado = (id, body) =>
    apiRequest(`/cuentas/${id}/estado`, { method: "PATCH", body });

export const cambiarRol = (id, body) =>
    apiRequest(`/cuentas/${id}/rol`, { method: "PATCH", body });

// Devuelve { items, total, pagina, tamanoPagina }.
export const listarAuditoria = (filtros = {}) =>
    apiRequest(`/cuentas/auditoria?${aQuery(filtros)}`);
