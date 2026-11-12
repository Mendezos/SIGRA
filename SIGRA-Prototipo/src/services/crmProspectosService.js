import { apiRequest } from "./apiClient";

function query(params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") usp.set(k, v);
    });
    const text = usp.toString();
    return text ? `?${text}` : "";
}

// ---------- Identificadores y textos ----------
export const codigoProspecto = (id) => `PR-${String(id).padStart(4, "0")}`;
export const codigoContacto = (id) => `CT-${String(id).padStart(4, "0")}`;

export const MENSAJE_SIN_PROSPECTOS = "No se encontró ningún prospecto con los criterios de búsqueda ingresados";
export const MENSAJE_RANGO_INVALIDO = "La fecha inicial no puede ser posterior a la final";
export const ESTADOS_REACTIVACION = ["Nuevo", "Cotización enviada", "En negociación"];
export const ESTADOS_FINALES = ["Convertido", "Descartado"];

// ---------- Prospectos (CRMGPSC-001 a 004) ----------
export const listarProspectos = ({ empresa, sector, fuente, estado, idVendedor, desde, hasta } = {}) =>
    apiRequest(`/crm/prospectos${query({ empresa, sector, fuente, estado, idVendedor, desde, hasta })}`);
export const obtenerProspecto = (id) => apiRequest(`/crm/prospectos/${id}`);

// Responde { requiereConfirmacion, coincidencias, mensaje, prospecto }.
export const registrarProspecto = (datos) => apiRequest("/crm/prospectos", { method: "POST", body: datos });
export const editarProspecto = (id, datos) => apiRequest(`/crm/prospectos/${id}`, { method: "PUT", body: datos });
// Responden { resultado: "Aplicado" | "SinCambios", mensaje, prospecto, ... }. Un prospecto convertido responde 409 (ApiError).
export const descartarProspecto = (id, datos) => apiRequest(`/crm/prospectos/${id}/descartar`, { method: "PATCH", body: datos });
export const reactivarProspecto = (id, datos) => apiRequest(`/crm/prospectos/${id}/reactivar`, { method: "PATCH", body: datos });

// ---------- Contactos de empresa (CRMGPSC-005 a 007) ----------
export const listarContactos = ({ tipo, idEmpresa, texto, estado } = {}) => apiRequest(`/crm/contactos${query({ tipo, idEmpresa, texto, estado })}`);
export const obtenerContacto = (id) => apiRequest(`/crm/contactos/${id}`);
// Responden { resultado: "Guardado" | "RequiereConfirmacion" | "Duplicado", mensaje, contacto, principalActual, contactoExistente }.
export const registrarContacto = (datos) => apiRequest("/crm/contactos", { method: "POST", body: datos });
export const editarContacto = (id, datos) => apiRequest(`/crm/contactos/${id}`, { method: "PUT", body: datos });
export const desactivarContacto = (id, datos) => apiRequest(`/crm/contactos/${id}/desactivar`, { method: "PATCH", body: datos });
export const reactivarContacto = (id) => apiRequest(`/crm/contactos/${id}/reactivar`, { method: "PATCH" });

// ---------- Validación en el cliente (los mismos mensajes que devuelve el servidor) ----------
const PATRON_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PATRON_TELEFONO = /^[0-9+\-\s()]{7,20}$/;
export const MAXIMO_FLOTA = 1000000;

export const MENSAJE_CORREO = "Formato inválido (ejemplo: nombre@empresa.com).";
export const MENSAJE_TELEFONO = "Formato inválido (use de 7 a 20 caracteres: números, +, -, espacios y paréntesis).";
export const MENSAJE_MEDIO_CONTACTO = "Debe ingresar al menos un medio de contacto: teléfono o correo electrónico.";

const soloDigitos = (t) => (t ?? "").replace(/\D/g, "");
export const correoValido = (c) => c.length <= 150 && PATRON_CORREO.test(c);
export const telefonoValido = (t) => PATRON_TELEFONO.test(t) && soloDigitos(t).length >= 7;

// Devuelve { mensaje, errores: { campo: texto } }; errores vacío = todo en orden.
export function validarProspecto(f, { requiereVendedor = true } = {}) {
    const errores = {};
    const empresa = f.empresa.trim().replace(/\s+/g, " ");
    const correo = f.correo.trim();
    const telefono = f.telefono.trim();
    const flota = String(f.tamanoFlota ?? "").trim();
    let mensaje = "";

    if (!empresa) errores.empresa = "Campo obligatorio.";
    if (!f.sector) errores.sector = "Campo obligatorio.";
    if (!f.fuente) errores.fuente = "Campo obligatorio.";
    if (requiereVendedor && !f.idVendedor) errores.idVendedor = "Campo obligatorio.";
    if (Object.keys(errores).length > 0) mensaje = "Debe completar los campos obligatorios del prospecto.";

    if (!correo && !telefono) {
        errores.telefono = "Ingrese al menos un teléfono o un correo.";
        errores.correo = "Ingrese al menos un teléfono o un correo.";
        mensaje ||= MENSAJE_MEDIO_CONTACTO;
    }

    if (empresa.length > 150) errores.empresa = "No puede superar los 150 caracteres.";
    if (f.direccion.trim().length > 300) errores.direccion = "No puede superar los 300 caracteres.";
    if (f.contacto.trim().length > 150) errores.contacto = "No puede superar los 150 caracteres.";
    if (correo && !correoValido(correo)) errores.correo = MENSAJE_CORREO;
    if (telefono && !telefonoValido(telefono)) errores.telefono = MENSAJE_TELEFONO;
    if (flota !== "") {
        const n = Number(flota);
        if (!Number.isInteger(n) || n < 0 || n > MAXIMO_FLOTA) errores.tamanoFlota = `Debe ser un número entero entre 0 y ${MAXIMO_FLOTA}.`;
    }

    if (!mensaje && Object.keys(errores).length > 0) mensaje = "Hay campos con formato inválido. Corrija los campos indicados.";
    return { mensaje, errores };
}

export function validarContacto(f) {
    const errores = {};
    const nombre = f.nombre.trim();
    const correo = f.correo.trim();
    const telefono = f.telefono.trim();
    let mensaje = "";

    const sinNombre = !nombre;
    const sinMedio = !correo && !telefono;
    if (sinNombre) errores.nombre = "Campo obligatorio.";
    if (sinMedio) {
        errores.telefono = "Ingrese al menos un teléfono o un correo.";
        errores.correo = "Ingrese al menos un teléfono o un correo.";
    }
    if (sinNombre && sinMedio) mensaje = "Debe ingresar el nombre completo del contacto y al menos un medio de contacto (teléfono o correo electrónico).";
    else if (sinNombre) mensaje = "Debe ingresar el nombre completo del contacto.";
    else if (sinMedio) mensaje = MENSAJE_MEDIO_CONTACTO;

    if (nombre.length > 150) errores.nombre = "No puede superar los 150 caracteres.";
    if (f.cargo.trim().length > 100) errores.cargo = "No puede superar los 100 caracteres.";
    if (correo && !correoValido(correo)) errores.correo = MENSAJE_CORREO;
    if (telefono && !telefonoValido(telefono)) errores.telefono = MENSAJE_TELEFONO;
    if (f.fechaCumpleanos) {
        if (f.fechaCumpleanos < "1900-01-01") errores.fechaCumpleanos = "No puede ser anterior a 1900.";
        else if (f.fechaCumpleanos > hoyLocal()) errores.fechaCumpleanos = "No puede ser futura.";
    }

    if (!mensaje && Object.keys(errores).length > 0) mensaje = "Hay campos con formato inválido. Corrija los campos indicados.";
    return { mensaje, errores };
}

function hoyLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// El servidor devuelve la lista de campos con problemas como "Campo" o "Campo: explicación"; se traduce a { clave: texto }.
const CAMPOS_SERVIDOR = {
    Empresa: "empresa",
    Sector: "sector",
    Dirección: "direccion",
    Teléfono: "telefono",
    "Correo electrónico": "correo",
    Contacto: "contacto",
    "Tamaño estimado de la flota": "tamanoFlota",
    "Fuente del contacto": "fuente",
    "Vendedor responsable": "idVendedor",
    "Nombre completo": "nombre",
    Cargo: "cargo",
    "Fecha de cumpleaños": "fechaCumpleanos",
    "Preferencia de contacto": "preferenciaContacto",
    Justificación: "justificacion",
    Motivo: "motivo",
    Observación: "observacion",
    Fecha: "fecha",
    "Estado inicial": "estadoInicial",
    "Próximo seguimiento": "seguimiento",
};

export function erroresDelServidor(errores = []) {
    const resultado = {};
    errores.forEach((texto) => {
        const [etiqueta, ...resto] = String(texto).split(": ");
        const clave = CAMPOS_SERVIDOR[etiqueta];
        if (clave) resultado[clave] = resto.join(": ") || "Revise este campo.";
    });
    return resultado;
}
