import { apiRequest } from "./apiClient";

function query(params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") usp.set(k, v);
    });
    const texto = usp.toString();
    return texto ? `?${texto}` : "";
}

// ---------- Dashboard (DAR) ----------
export const obtenerDashboardInventario = (filtros) => apiRequest(`/dashboard/inventario${query(filtros)}`);
