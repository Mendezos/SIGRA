import { apiRequest } from "./apiClient";

function query(params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") usp.set(k, v);
    });
    const text = usp.toString();
    return text ? `?${text}` : "";
}

export const ESTADOS_EQUIPO = [
    "Disponible",
    "Alquilado",
    "En mantenimiento",
    "En reparación",
    "En garantía",
    "Dado de baja",
];

export const TIPOS_ENTRADA = ["Compra", "Devolución de cliente", "Equipo reparado"];

export function listarCategorias() {
    return apiRequest("/inventario/categorias");
}

export function listarProveedores() {
    return apiRequest("/inventario/proveedores");
}

export function listarModelos(idCategoria) {
    return apiRequest(`/inventario/modelos${query({ idCategoria })}`);
}

export function listarEquipos({ texto, idCategoria, estado } = {}) {
    return apiRequest(`/inventario/equipos${query({ texto, idCategoria, estado })}`);
}

export function existeSerie(serie) {
    return apiRequest(`/inventario/equipos/existe-serie${query({ serie })}`);
}

export function obtenerFichaPorSerie(serie) {
    return apiRequest(`/inventario/equipos/serie/${encodeURIComponent(serie)}`);
}

export function obtenerFichaPorId(idEquipo) {
    return apiRequest(`/inventario/equipos/${idEquipo}`);
}

export function registrarEquipo(datos) {
    return apiRequest("/inventario/equipos", { method: "POST", body: datos });
}

export function cambiarEstadoEquipo(idEquipo, estado, motivo) {
    return apiRequest(`/inventario/equipos/${idEquipo}/estado`, {
        method: "PATCH",
        body: { estado, motivo: motivo || null },
    });
}

export function listarMovimientos({ idEquipo, tipo } = {}) {
    return apiRequest(`/inventario/movimientos${query({ idEquipo, tipo })}`);
}

export function registrarEntrada(datos) {
    return apiRequest("/inventario/movimientos/entrada", { method: "POST", body: datos });
}

export function registrarSalida(datos) {
    return apiRequest("/inventario/movimientos/salida", { method: "POST", body: datos });
}

export function stockPorCategoria() {
    return apiRequest("/inventario/stock/categorias");
}

export function stockPorModelo(idCategoria) {
    return apiRequest(`/inventario/stock/modelos${query({ idCategoria })}`);
}

export function guardarStockMinimo(idCategoria, cantidadMinima) {
    return apiRequest(`/inventario/stock/categorias/${idCategoria}/minimo`, {
        method: "PUT",
        body: { cantidadMinima },
    });
}

export function listarArticulos(tipo) {
    return apiRequest(`/inventario/${tipo}`);
}

export function crearArticulo(tipo, datos) {
    return apiRequest(`/inventario/${tipo}`, { method: "POST", body: datos });
}

export function editarArticulo(tipo, id, datos) {
    return apiRequest(`/inventario/${tipo}/${id}`, { method: "PUT", body: datos });
}
