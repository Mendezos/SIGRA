import { apiRequest } from "./apiClient";

// Campana única: todos los avisos del usuario (tickets, seguimientos, baterías, contratos, frecuencias...).
export const listarNotificaciones = () => apiRequest("/notificaciones");
export const obtenerResumenNotificaciones = () => apiRequest("/notificaciones/resumen");
export const marcarNotificacionLeida = (idNotificacion) => apiRequest(`/notificaciones/${idNotificacion}/leer`, { method: "POST" });
export const marcarTodasLeidas = () => apiRequest("/notificaciones/leer-todas", { method: "POST" });
