import { apiRequest } from "./apiClient";

// ---------- Alertas unificadas (DAR-003, 018 y 019) ----------
export const listarAlertas = () => apiRequest("/alertas");
export const atenderAlerta = (clave, nota) => apiRequest("/alertas/atender", { method: "POST", body: { clave, nota } });
export const listarVistas = () => apiRequest("/alertas/vistas");
export const guardarVista = (nombre, filtros) => apiRequest("/alertas/vistas", { method: "POST", body: { nombre, filtros: JSON.stringify(filtros) } });
export const eliminarVista = (id) => apiRequest(`/alertas/vistas/${id}`, { method: "DELETE" });
