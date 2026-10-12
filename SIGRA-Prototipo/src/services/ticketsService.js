import { apiDownload, apiRequest } from "./apiClient";

export function query(values = {}) {
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) params.set(key, String(value));
    });
    return params.size ? `?${params}` : "";
}
export const listar = (filtro) => apiRequest(`/tickets${query(filtro)}`);
export const resumen = () => apiRequest("/tickets/resumen");
export const obtener = (id) => apiRequest(`/tickets/${id}`);
export const clientes = (texto) => apiRequest(`/tickets/clientes${query({ texto })}`);
export const tecnicos = () => apiRequest("/tickets/tecnicos");
export const configuracion = () => apiRequest("/tickets/configuracion");
export const guardarConfiguracion = (body) => apiRequest("/tickets/configuracion", { method: "PUT", body });
export const guardarEspecialidades = (id, especialidades) => apiRequest(`/tickets/tecnicos/${id}/especialidades`, { method: "PUT", body: { especialidades } });
export const registrar = (body) => apiRequest("/tickets", { method: "POST", body });
export const editar = (id, body) => apiRequest(`/tickets/${id}`, { method: "PUT", body });
export const operar = (id, operacion, body) => apiRequest(`/tickets/${id}/${operacion}`, { method: "POST", body });
export const guardarTrabajo = (id, body) => apiRequest(`/tickets/${id}/trabajo`, { method: "PUT", body });
export const seguimiento = (codigo) => apiRequest(`/tickets/seguimiento/${encodeURIComponent(codigo.trim())}`);
export const seguimientoCliente = (empresa) => apiRequest(`/tickets/seguimiento-cliente${query({ empresa })}`);
export const historial = (filtro) => apiRequest(`/tickets/historial${query(filtro)}`);
export const indicadores = (filtro) => apiRequest(`/tickets/indicadores${query(filtro)}`);
export const auditoria = (filtro) => apiRequest(`/tickets/auditoria${query(filtro)}`);
export const garantias = (filtro) => apiRequest(`/tickets/garantias${query(filtro)}`);
export const agregarSeguimiento = (id, body) => apiRequest(`/tickets/garantias/${id}/seguimiento`, { method: "POST", body });
export const comprobante = (id) => apiDownload(`/tickets/${id}/comprobante`);
export const enviarComprobante = (id, body) => apiRequest(`/tickets/${id}/comprobante/enviar`, { method: "POST", body });
export const exportarHistorial = (filtro, formato) => apiDownload(`/tickets/historial/exportar${query({ ...filtro, formato })}`);
export const exportarGarantias = (filtro, formato) => apiDownload(`/tickets/garantias/exportar${query({ ...filtro, formato })}`);

export function descargar(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a"); enlace.href = url; enlace.download = nombre;
    document.body.appendChild(enlace); enlace.click(); enlace.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export const responsablesAuditoria = () => apiRequest("/tickets/auditoria/responsables");
