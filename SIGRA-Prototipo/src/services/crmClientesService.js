import { apiRequest } from "./apiClient";

function query(params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") usp.set(k, v);
    });
    const text = usp.toString();
    return text ? `?${text}` : "";
}

export const codigoCliente = (id) => `CL-${String(id).padStart(4, "0")}`;

// CRMGPSC-021: clientes y su perfil
export const listarClientes = ({ texto, idVendedor, estado } = {}) => apiRequest(`/crm/clientes${query({ texto, idVendedor, estado })}`);
export const obtenerPerfil = (id) => apiRequest(`/crm/clientes/${id}/perfil`);

// CRMGPSC-019: convertir un prospecto en cliente (o vincularlo con uno existente)
export const convertirProspecto = (id, datos) => apiRequest(`/crm/prospectos/${id}/convertir`, { method: "POST", body: datos });

// CRMGPSC-020: asignar o reasignar al vendedor responsable (tipo: "prospectos" | "clientes")
export const asignarResponsable = (tipo, id, datos) => apiRequest(`/crm/${tipo}/${id}/responsable`, { method: "PUT", body: datos });
