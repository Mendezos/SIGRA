import { apiBlob, apiRequest } from "./apiClient";

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

// Fichas técnicas de repetidoras
export const listarRepetidoras = ({ texto, facturable } = {}) => apiRequest(`/alquiler/repetidoras${query({ texto, facturable })}`);
export const obtenerRepetidoraPorSerie = (serie) => apiRequest(`/alquiler/repetidoras/serie/${encodeURIComponent(serie)}`);
export const registrarFichaRepetidora = (datos) => apiRequest("/alquiler/repetidoras/ficha", { method: "POST", body: datos });
export const actualizarFichaRepetidora = (datos) => apiRequest("/alquiler/repetidoras/ficha", { method: "PUT", body: datos });

// Checklist previo a la instalación de repetidoras
export const obtenerChecklist = (serie) => apiRequest(`/alquiler/repetidoras/${encodeURIComponent(serie)}/checklist`);
export const guardarChecklist = (serie, datos) =>
    apiRequest(`/alquiler/repetidoras/${encodeURIComponent(serie)}/checklist`, { method: "POST", body: datos });

// Documentos técnicos de la repetidora
export const TIPOS_DOCUMENTO = ["Plano", "Acta de instalación", "Otro"];
export const EXTENSIONES_DOCUMENTO = [".pdf", ".jpg", ".jpeg", ".png", ".xlsx"];
export const TAMANO_MAXIMO_DOCUMENTO = 10 * 1024 * 1024;
export const MENSAJE_FORMATO_DOCUMENTO = "Formato de archivo no permitido, use PDF, JPG, PNG o XLSX";
export const MENSAJE_TAMANO_DOCUMENTO = "El archivo supera el tamaño máximo permitido de 10 MB";

export const listarDocumentos = (serie) => apiRequest(`/alquiler/repetidoras/${encodeURIComponent(serie)}/documentos`);
export const adjuntarDocumento = (serie, { archivo, tipoDocumento, nombreDocumento }) => {
    const form = new FormData();
    form.append("archivo", archivo);
    form.append("tipoDocumento", tipoDocumento);
    if (nombreDocumento) form.append("nombreDocumento", nombreDocumento);
    return apiRequest(`/alquiler/repetidoras/${encodeURIComponent(serie)}/documentos`, { method: "POST", body: form });
};
export const descargarDocumento = (id, descargar = true) =>
    apiBlob(`/alquiler/repetidoras/documentos/${id}/archivo?descargar=${descargar}`);

// Bitácora de mantenimiento de la repetidora (se alimenta sola al cerrar tickets)
export const obtenerBitacoraRepetidora = (serie) => apiRequest(`/alquiler/repetidoras/${encodeURIComponent(serie)}/bitacora`);
