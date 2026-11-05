import { apiRequest } from "./apiClient";

function query(params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") usp.set(k, v);
    });
    const text = usp.toString();
    return text ? `?${text}` : "";
}

export const codigoPlantilla = (id) => `PL-${String(id).padStart(3, "0")}`;

// Plantillas de contrato (GCFS-001 a 004)
export const listarPlantillas = (filtro = {}) => apiRequest(`/contratos/plantillas${query(filtro)}`);
export const obtenerPlantilla = (id, version) => apiRequest(`/contratos/plantillas/${id}${query({ version })}`);
export const registrarPlantilla = (datos) => apiRequest("/contratos/plantillas", { method: "POST", body: datos });
export const editarPlantilla = (id, datos) => apiRequest(`/contratos/plantillas/${id}`, { method: "PUT", body: datos });
export const cambiarEstadoPlantilla = (id, activa, motivo) =>
    apiRequest(`/contratos/plantillas/${id}/estado`, { method: "PATCH", body: { activa, motivo } });
