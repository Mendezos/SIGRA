import { apiRequest } from "./apiClient";

export const listarEncuestas = () => apiRequest("/encuestas");
export const obtenerHistorialCliente = (idCliente) => apiRequest(`/encuestas/clientes/${idCliente}/historial`);

export const reenviarEncuesta = (idEncuesta) =>
    apiRequest(`/encuestas/${idEncuesta}/reenviar`, { method: "POST" });

export const obtenerEncuestaPublica = (token) =>
    apiRequest(`/encuestas/publica/${encodeURIComponent(token)}`, { auth: false });

export const responderEncuesta = (token, datos) =>
    apiRequest(`/encuestas/publica/${encodeURIComponent(token)}/responder`, {
        method: "POST",
        body: datos,
        auth: false,
    });
