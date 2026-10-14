export const ACCIONES_AUDITORIA = {
    LOGIN_EXITOSO: "Login Exitoso",
    LOGIN_FALLIDO: "Login Fallido",
    LOGIN_BLOQUEADO: "Login Bloqueado",
    LOGIN_CUENTA_INACTIVA: "Login con cuenta inactiva",
    LOGOUT: "Cierre de sesión",
    CUENTA_CREADA: "Cuenta creada",
    CUENTA_EDITADA: "Datos de cuenta actualizados",
    CUENTA_DESACTIVADA: "Cuenta inactivada",
    CUENTA_REACTIVADA: "Cuenta reactivada",
    CUENTA_BLOQUEADA: "Cuenta bloqueada",
    CUENTA_DESBLOQUEADA: "Cuenta desbloqueada",
    ROL_CAMBIADO: "Rol cambiado",
    POLITICA_ACTUALIZADA: "Política de seguridad actualizada",
    RECUPERACION_SOLICITADA: "Recuperación de contraseña solicitada",
    RECUPERACION_EMAIL_FALLIDO: "Envío de correo de recuperación fallido",
    PASSWORD_RESTABLECIDA: "Contraseña restablecida",
    NOTIFICACION_DESBLOQUEO_FALLIDA: "Notificación de desbloqueo fallida",
};

export const ENTIDADES_AUDITORIA = {
    Usuario: "Cuenta",
    Sesion: "Sesión",
    PoliticaSeguridad: "Política de seguridad",
};

// Solo se presentan campos de negocio; los identificadores internos no se muestran.
const CAMPOS_DETALLE = {
    nombre: "Nombre completo",
    correo: "Correo corporativo",
    cedula: "Cédula",
    fechanacimiento: "Fecha de nacimiento",
    telefono: "Teléfono",
    direccion: "Dirección",
    estadocivil: "Estado civil",
    gradoacademico: "Grado académico",
    salario: "Salario",
    rol: "Rol",
    activo: "Estado",
    bloqueada: "Bloqueo",
    fechacreacion: "Fecha de creación",
    ultimoacceso: "Último acceso",
    intentosfallidos: "Intentos fallidos",
    bloqueadohasta: "Bloqueada hasta",
    fechabloqueo: "Fecha de bloqueo",
    minutosinactividad: "Tiempo de inactividad (minutos)",
    maxintentosfallidos: "Máximo de intentos fallidos",
    longitudminimapassword: "Longitud mínima de la contraseña",
    minutosbloqueo: "Duración del bloqueo (minutos)",
    vigenciaenlaceminutos: "Vigencia del enlace de recuperación (minutos)",
    motivo: "Motivo",
    mensaje: "Mensaje",
};

const normalizarCampo = (campo) => campo.replace(/_/g, "").toLowerCase();

function textoLegible(texto) {
    const palabras = String(texto ?? "")
        .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, "$1 $2")
        .replace(/_/g, " ")
        .toLowerCase();
    return palabras.charAt(0).toUpperCase() + palabras.slice(1);
}

export const formatearAccion = (accion) =>
    ACCIONES_AUDITORIA[accion] ?? (textoLegible(accion) || "Sin acción registrada");

export const formatearEntidad = (entidad) =>
    ENTIDADES_AUDITORIA[entidad] ?? (textoLegible(entidad) || "Sin registro");

export function leerDetalle(detalle) {
    if (detalle && typeof detalle === "object") return detalle;

    try {
        return JSON.parse(detalle);
    } catch {
        return null;
    }
}

function formatearFecha(valor, soloFecha = false) {
    const texto = String(valor);
    // Las fechas de nacimiento no tienen zona horaria; los eventos se guardan en UTC.
    const entrada = soloFecha
        ? `${texto.slice(0, 10)}T00:00:00`
        : /^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(texto) ? `${texto}Z` : texto;
    const fecha = new Date(entrada);
    if (Number.isNaN(fecha.getTime())) return "Sin registro";

    return soloFecha
        ? fecha.toLocaleDateString("es-CR")
        : fecha.toLocaleString("es-CR", { timeZone: "America/Costa_Rica" });
}

export function formatearValor(campo, valor) {
    if (valor == null || valor === "") return "Sin registro";

    const clave = normalizarCampo(campo);
    if (clave === "activo") return valor === true || valor === 1 ? "Activo" : "Inactivo";
    if (clave === "bloqueada") return valor === true || valor === 1 ? "Bloqueada" : "Sin bloqueo";
    if (clave === "fechanacimiento") return formatearFecha(valor, true);
    if (["fechacreacion", "ultimoacceso", "bloqueadohasta", "fechabloqueo"].includes(clave)) {
        return formatearFecha(valor);
    }
    if (clave === "salario" && Number.isFinite(Number(valor))) {
        return Number(valor).toLocaleString("es-CR", { style: "currency", currency: "CRC" });
    }
    if (typeof valor === "boolean") return valor ? "Sí" : "No";
    if (typeof valor === "object") return "Sin información disponible";
    return String(valor);
}

export function camposDetalle(valor) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) return [];

    return Object.keys(valor).filter((campo) => CAMPOS_DETALLE[normalizarCampo(campo)]);
}

export const etiquetaCampo = (campo) => CAMPOS_DETALLE[normalizarCampo(campo)];

export function resumirDetalle(valor) {
    if (typeof valor === "string") return valor || "Sin registro";

    return camposDetalle(valor)
        .map((campo) => `${etiquetaCampo(campo)}: ${formatearValor(campo, valor[campo])}`)
        .join("\n") || "Sin registro";
}
