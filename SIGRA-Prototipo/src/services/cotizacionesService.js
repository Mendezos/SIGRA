import { apiRequest } from "./apiClient";

export const listarCotizaciones = () =>
    apiRequest("/cotizaciones");

export const obtenerCotizacion = (id) =>
    apiRequest(`/cotizaciones/${id}`);

export const registrarCotizacion = (datos) =>
    apiRequest("/cotizaciones", {
        method: "POST",
        body: datos,
    });

export const actualizarCotizacion = (id, datos) =>
    apiRequest(`/cotizaciones/${id}`, {
        method: "PUT",
        body: datos,
    });

export const cambiarEstadoCotizacion = (id, estado) =>
    apiRequest(`/cotizaciones/${id}/estado`, {
        method: "PATCH",
        body: { estado },
    });

export const desactivarCotizacion = (id) =>
    apiRequest(`/cotizaciones/${id}/desactivar`, {
        method: "PATCH",
    });
