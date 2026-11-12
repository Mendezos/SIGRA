import { apiRequest } from "./apiClient";

export const listarNotasCredito = () => apiRequest("/notas-credito");

export const registrarNotaCredito = (datos) =>
    apiRequest("/notas-credito", { method: "POST", body: datos });
