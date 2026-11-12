import { apiRequest } from "./apiClient";

export const listarFacturas = () => apiRequest("/facturas");

export const registrarFactura = (datos) =>
    apiRequest("/facturas", { method: "POST", body: datos });

export const cambiarEstadoCobro = (id, datos) =>
    apiRequest(`/facturas/${id}/estado-cobro`, {
        method: "PATCH",
        body: datos,
    });
