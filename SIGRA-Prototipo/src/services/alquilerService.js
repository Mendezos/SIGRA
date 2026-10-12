import { apiRequest } from "./apiClient";

function query(params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") usp.set(k, v);
    });
    const text = usp.toString();
    return text ? `?${text}` : "";
}

export const ESTADOS_CONTRATO = [
    { value: "Activo", label: "Activo" },
    { value: "Por vencer (90 días)", label: "Por vencer (90 días)" },
    { value: "Por vencer (30 días)", label: "Por vencer (30 días)" },
    { value: "Vencido", label: "Vencido" },
    { value: "Renovado", label: "Renovado" },
    { value: "Cancelado", label: "Cancelado" },
];

export const codigoContrato = (id) => `CT-${String(id).padStart(4, "0")}`;

// Contactos iniciales
export const listarVendedores = () => apiRequest("/alquiler/vendedores");
export const sugerenciaContacto = (empresa) => apiRequest(`/alquiler/contactos/sugerencia${query({ empresa })}`);
export const listarContactos = () => apiRequest("/alquiler/contactos");
export const obtenerContacto = (id) => apiRequest(`/alquiler/contactos/${id}`);
export const registrarContacto = (datos) => apiRequest("/alquiler/contactos", { method: "POST", body: datos });
export const reasignarContacto = (id, idVendedor, motivo) =>
    apiRequest(`/alquiler/contactos/${id}/vendedor`, { method: "PUT", body: { idVendedor, motivo } });

// Contratos
export const listarClientes = () => apiRequest("/alquiler/clientes");
export const listarEquiposDisponibles = () => apiRequest("/alquiler/equipos-disponibles");
export const listarContratos = ({ texto, estado } = {}) => apiRequest(`/alquiler/contratos${query({ texto, estado })}`);
export const obtenerContrato = (id) => apiRequest(`/alquiler/contratos/${id}`);
export const registrarContrato = (datos) => apiRequest("/alquiler/contratos", { method: "POST", body: datos });

export const guardarAccesoriosContrato = (id, accesorios) =>
    apiRequest(`/alquiler/contratos/${id}/accesorios`, { method: "PUT", body: { accesorios } });
export const renovarContrato = (id, datos) => apiRequest(`/alquiler/contratos/${id}/renovar`, { method: "POST", body: datos });
export const cancelarContrato = (id, motivo) => apiRequest(`/alquiler/contratos/${id}/cancelar`, { method: "POST", body: { motivo } });
export const listarRenovaciones = (id) => apiRequest(`/alquiler/contratos/${id}/renovaciones`);
export const listarAuditoriaContrato = (id) => apiRequest(`/alquiler/contratos/${id}/auditoria`);

// Radios en alquiler
export const listarRadios = (texto) => apiRequest(`/alquiler/radios${query({ texto })}`);
export const obtenerRadioPorSerie = (serie) => apiRequest(`/alquiler/radios/serie/${encodeURIComponent(serie)}`);
export const agregarRadio = (datos) => apiRequest("/alquiler/radios", { method: "POST", body: datos });

// Baterías de los radios
export const listarBaterias = (idRadio) => apiRequest(`/alquiler/radios/${idRadio}/baterias`);
export const registrarCambioBateria = (datos) => apiRequest("/alquiler/radios/bateria", { method: "POST", body: datos });
export const bateriasPorCambiar = () => apiRequest("/alquiler/baterias/alertas");
