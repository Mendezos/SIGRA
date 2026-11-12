import { apiRequest } from "./apiClient";

// ---------- Historial de cambios del CRM (CRMGPSC-026), solo para el administrador ----------
export const ENTIDADES_AUDITORIA = [
    { value: "Prospecto", label: "Prospecto" },
    { value: "Cliente", label: "Cliente" },
    { value: "ContactoEmpresa", label: "Contacto de empresa" },
    { value: "NotaCRM", label: "Nota" },
    { value: "InteraccionCRM", label: "Interacción" },
    { value: "Seguimiento", label: "Seguimiento" },
    { value: "SerieContacto", label: "Contacto periódico" },
];

export const nombreEntidad = (valor) => ENTIDADES_AUDITORIA.find((e) => e.value === valor)?.label ?? valor;

// PROSPECTO_EDITADO -> "Prospecto editado"
export const nombreAccion = (accion) => {
    const texto = String(accion ?? "").toLowerCase().replace(/_/g, " ");
    return texto.charAt(0).toUpperCase() + texto.slice(1);
};

export const FILTROS_AUDITORIA_VACIOS = { entidad: "", idEntidad: "", idAutor: "", accion: "", empresa: "", idVendedor: "", desde: "", hasta: "" };

function query(params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") usp.set(k, v);
    });
    const texto = usp.toString();
    return texto ? `?${texto}` : "";
}

export const consultarAuditoriaCrm = (filtros, pagina, tamanoPagina) =>
    apiRequest(`/crm/auditoria${query({ ...filtros, pagina, tamanoPagina })}`);

export const obtenerEventoAuditoriaCrm = (id) => apiRequest(`/crm/auditoria/${id}`);
