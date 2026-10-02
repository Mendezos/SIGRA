import { apiRequest } from "./apiClient";

export const listarCuentas = () => apiRequest("/cuentas");
export const listarRoles = () => apiRequest("/cuentas/roles");

export const crearCuenta = (body) =>
    apiRequest("/cuentas", { method: "POST", body });

export const editarCuenta = (id, body) =>
    apiRequest(`/cuentas/${id}`, { method: "PUT", body });

export const cambiarEstado = (id, body) =>
    apiRequest(`/cuentas/${id}/estado`, { method: "PATCH", body });

export const cambiarRol = (id, body) =>
    apiRequest(`/cuentas/${id}/rol`, { method: "PATCH", body });

export function listarAuditoria(filtros) {
    const query = new URLSearchParams();

    Object.entries(filtros).forEach(([key, value]) => {
        if (value !== "" && value != null) {
            query.set(key, String(value));
        }
    });
    return apiRequest(`/cuentas/auditoria?${query}`);
}
