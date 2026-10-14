import { apiBlob, apiRequest } from "./apiClient";

function query(params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") usp.set(k, v);
    });
    const text = usp.toString();
    return text ? `?${text}` : "";
}

export const codigoSolicitud = (id) => `SF-${String(id).padStart(4, "0")}`;

export const ESTADO_INICIAL = "En solicitud";
export const BANDAS = ["VHF", "UHF", "700 MHz", "800 MHz", "900 MHz"];

export const TIPOS_DOCUMENTO = ["Formulario presentado", "Acuse de recibo", "Otro"];
export const EXTENSIONES_DOCUMENTO = [".pdf", ".jpg", ".jpeg", ".png", ".xlsx"];
export const TAMANO_MAXIMO_DOCUMENTO = 10 * 1024 * 1024;
export const MAXIMO_DOCUMENTOS = 10;
export const MENSAJE_FORMATO_DOCUMENTO = "Formato de archivo no permitido, use PDF, JPG, PNG o XLSX";
export const MENSAJE_TAMANO_DOCUMENTO = "El archivo supera el tamaño máximo permitido de 10 MB";

// Catálogos del formulario
export const listarClientes = () => apiRequest("/frecuencias/clientes");
export const listarRepetidorasDeCliente = (idCliente) => apiRequest(`/frecuencias/clientes/${idCliente}/repetidoras`);
export const listarVendedores = () => apiRequest("/frecuencias/vendedores");

// Solicitudes
export const ESTADOS_SOLICITUD = ["En solicitud", "Vigente", "Por renovar", "En renovación", "Vencida", "Renovada", "Cancelada"];
export const MENSAJE_SIN_RESULTADOS = "No se encontraron solicitudes con los criterios de búsqueda ingresados";

// Búsqueda y filtros: texto libre, cliente, estado, zona y vendedor responsable (los criterios se combinan).
export const listarSolicitudes = ({ texto, estado, cliente, zona, idVendedor } = {}) =>
    apiRequest(`/frecuencias/solicitudes${query({ texto, estado, cliente, zona, idVendedor })}`);
export const obtenerSolicitud = (id) => apiRequest(`/frecuencias/solicitudes/${id}`);

// La solicitud viaja como formulario multipart porque puede incluir los documentos del trámite.
export const registrarSolicitud = ({ formularios = [], acuses = [], ...datos }) => {
    const form = new FormData();
    Object.entries(datos).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") form.append(k, v);
    });
    formularios.forEach((archivo) => form.append("formularios", archivo));
    acuses.forEach((archivo) => form.append("acuses", archivo));
    return apiRequest("/frecuencias/solicitudes", { method: "POST", body: form });
};

// Alertas de vencimiento
export const TIPOS_ALERTA = {
    Primera: "Primera alerta (6 meses)",
    Segunda: "Segunda alerta (3 meses)",
    Final: "Alerta final (30 días) · URGENTE",
};
export const listarAlertas = ({ atendida } = {}) => apiRequest(`/frecuencias/alertas${query({ atendida })}`);
export const atenderAlerta = (id, nota) => apiRequest(`/frecuencias/alertas/${id}/atender`, { method: "POST", body: { nota } });
export const verificarAlertas = () => apiRequest("/frecuencias/alertas/verificar", { method: "POST" });
export const obtenerResumen = () => apiRequest("/frecuencias/resumen");
export const listarVencidas = () => listarSolicitudes({ estado: "Vencida" });

// Estados desde los que se puede iniciar la renovación. "Cancelada" no es renovable, pero se deja intentar
// para mostrar el mensaje correspondiente.
export const ESTADOS_RENOVABLES = ["Vigente", "Por renovar", "Vencida"];
export const MENSAJE_RENOVAR_CANCELADA = "No es posible renovar una frecuencia cancelada";

// Bitácora de auditoría de la solicitud (solo Administrador). Es de solo lectura: el servidor rechaza editar y eliminar eventos.
export const obtenerAuditoria = (id) => apiRequest(`/frecuencias/solicitudes/${id}/auditoria`);
export const editarEventoAuditoria = (id, idAuditoria) =>
    apiRequest(`/frecuencias/solicitudes/${id}/auditoria/${idAuditoria}`, { method: "PUT", body: {} });
export const eliminarEventoAuditoria = (id, idAuditoria) =>
    apiRequest(`/frecuencias/solicitudes/${id}/auditoria/${idAuditoria}`, { method: "DELETE" });

// Historial de ciclos (solicitud original y renovaciones) de la frecuencia
export const obtenerHistorial = (id) => apiRequest(`/frecuencias/solicitudes/${id}/historial`);

// Cancelación de la solicitud. Una frecuencia con renovación en trámite o ya renovada no se puede cancelar.
export const ESTADOS_CANCELABLES = ["En solicitud", "Otorgada", "Vigente", "Por renovar", "Vencida"];
export const cancelarSolicitud = (id, motivo) =>
    apiRequest(`/frecuencias/solicitudes/${id}/cancelacion`, { method: "POST", body: { motivo } });

// Otorgamiento de la frecuencia por parte del gobierno
export const registrarOtorgamiento = (id, { fechaOtorgamiento, numeroResolucion }) =>
    apiRequest(`/frecuencias/solicitudes/${id}/otorgamiento`, { method: "POST", body: { fechaOtorgamiento, numeroResolucion } });

// El vencimiento es la fecha de otorgamiento + 5 años (misma regla que aplica el servidor).
export const ANIOS_VIGENCIA = 5;
export function vencimientoDe(fechaISO) {
    if (!fechaISO) return "";
    const [a, m, d] = fechaISO.split("-").map(Number);
    const fecha = new Date(a + ANIOS_VIGENCIA, m - 1, d);
    if (fecha.getMonth() !== m - 1) fecha.setDate(0); // 29 de febrero -> 28 de febrero
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

// Documentos de la solicitud
export const listarDocumentos = (id) => apiRequest(`/frecuencias/solicitudes/${id}/documentos`);
export const adjuntarDocumento = (id, { archivo, tipoDocumento }) => {
    const form = new FormData();
    form.append("archivo", archivo);
    form.append("tipoDocumento", tipoDocumento);
    return apiRequest(`/frecuencias/solicitudes/${id}/documentos`, { method: "POST", body: form });
};
export const descargarDocumento = (id, descargar = true) =>
    apiBlob(`/frecuencias/solicitudes/documentos/${id}/archivo?descargar=${descargar}`);
