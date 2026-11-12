import { apiRequest } from "./apiClient";

function query(params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") usp.set(k, v);
    });
    const text = usp.toString();
    return text ? `?${text}` : "";
}

// ---------- Catálogos compartidos del CRM (módulo 9) ----------
// Una "empresa" del CRM es un prospecto o un cliente: tipo = "Prospecto" | "Cliente".
export const listarEmpresas = ({ texto, tipo, soloActivas = true } = {}) =>
    apiRequest(`/crm/catalogos/empresas${query({ texto, tipo, soloActivas })}`);
export const listarContactosDeEmpresa = (tipo, idEmpresa, soloActivos = true) =>
    apiRequest(`/crm/catalogos/empresas/${tipo}/${idEmpresa}/contactos${query({ soloActivos })}`);
export const listarVendedores = () => apiRequest("/crm/catalogos/vendedores");

// ---------- Valores permitidos (los mismos que valida el servidor y las restricciones de la base de datos) ----------
// Si se cambia alguno hay que cambiarlo también en SIGRA.Abstracciones/Dtos/CrmCatalogosDtos.cs (clase CrmCatalogos).
export const TIPO_PROSPECTO = "Prospecto";
export const TIPO_CLIENTE = "Cliente";
export const ESTADOS_PROSPECTO = ["Nuevo", "Cotización enviada", "En negociación", "Convertido", "Descartado"];
export const FUENTES_PROSPECTO = ["Referido", "Sitio web", "Llamada entrante", "Redes sociales", "Feria o evento", "Cliente existente", "Otra"];
export const SECTORES_EMPRESA = ["Turismo y hotelería", "Transporte", "Seguridad", "Construcción", "Industria", "Gobierno", "Agricultura", "Salud", "Educación", "Comercio", "Otro"];
export const MOTIVOS_DESCARTE = ["Sin interés", "Precio", "Eligió a la competencia", "Sin presupuesto", "No contesta", "Datos incorrectos", "Otro"];
export const PREFERENCIAS_CONTACTO = ["Teléfono", "Correo", "Cualquiera"];
export const TIPOS_INTERACCION = ["Llamada", "Correo", "Visita", "Reunión", "WhatsApp", "Acuerdo", "Otro"];
export const CATEGORIAS_NOTA = ["General", "Comercial", "Técnica", "Facturación", "Otra"];
export const VISIBILIDADES_NOTA = [
    { value: "Privada", label: "Privada (solo yo)" },
    { value: "Equipo", label: "Equipo comercial" },
    { value: "General", label: "General (todos los que usan el CRM)" },
];
export const TIPOS_SEGUIMIENTO = ["Llamada", "Visita", "Correo", "Reunión", "WhatsApp", "Otro"];
export const PRIORIDADES_SEGUIMIENTO = ["Baja", "Media", "Alta"];
export const ESTADOS_SEGUIMIENTO = ["Pendiente", "Atrasado", "Completado", "Cancelado"];
export const PERIODICIDADES = ["Mensual", "Trimestral", "Semestral"];
export const MEDIOS_ATENCION_BATERIA = ["Llamada", "Correo", "Visita", "WhatsApp", "Otro"];
export const MESES_RECORDATORIO_BATERIA = 11;

// Clave única de una empresa para los selectores: "Prospecto:12" / "Cliente:3".
export const claveEmpresa = (tipo, idEmpresa) => `${tipo}:${idEmpresa}`;
export function separarClaveEmpresa(clave) {
    if (!clave) return null;
    const [tipo, id] = clave.split(":");
    return { tipo, idEmpresa: Number(id) };
}
