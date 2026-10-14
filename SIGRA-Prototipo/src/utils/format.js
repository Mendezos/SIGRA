const ZONA = "America/Costa_Rica";

// Las fechas de la BD son UTC; si llegan sin zona horaria se interpretan como UTC.
function aFecha(value) {
    if (value instanceof Date) return value;

    const texto = String(value);
    const tieneZona = /(Z|[+-]\d{2}:?\d{2})$/i.test(texto);

    return new Date(tieneZona || !texto.includes("T") ? texto : `${texto}Z`);
}

export function formatearFechaHora(value, vacio = "Sin registro") {
    if (!value) return vacio;

    const fecha = aFecha(value);
    if (Number.isNaN(fecha.getTime())) return vacio;

    return fecha
        .toLocaleString("es-CR", {
            timeZone: ZONA,
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        })
        .replace(",", "");
}

// Fecha y hora exactas (con segundos), para la bitácora de auditoría.
export function formatearFechaHoraExacta(value, vacio = "Sin registro") {
    if (!value) return vacio;

    const fecha = aFecha(value);
    if (Number.isNaN(fecha.getTime())) return vacio;

    return fecha
        .toLocaleString("es-CR", {
            timeZone: ZONA,
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        })
        .replace(",", "");
}

// Fecha sin hora (por ejemplo fecha de nacimiento): no se desplaza por zona horaria.
export function formatearFechaCorta(value, vacio = "Sin registro") {
    if (!value) return vacio;

    const [anio, mes, dia] = String(value).slice(0, 10).split("-");
    if (!anio || !mes || !dia) return vacio;

    return `${dia}/${mes}/${anio}`;
}

export function formatearColones(value, vacio = "Sin registro") {
    if (value === null || value === undefined || value === "") return vacio;

    return new Intl.NumberFormat("es-CR", {
        style: "currency",
        currency: "CRC",
        maximumFractionDigits: 2,
    }).format(value);
}

export function formatearTelefono(value) {
    const digitos = String(value ?? "").replace(/\D/g, "");

    return digitos.length === 8 ? `${digitos.slice(0, 4)}-${digitos.slice(4)}` : (value ?? "");
}

export const ACCIONES_AUDITORIA = {
    LOGIN_EXITOSO: "Inicio de sesión exitoso",
    LOGIN_FALLIDO: "Intento de inicio de sesión fallido",
    LOGIN_BLOQUEADO: "Intento con cuenta bloqueada",
    LOGIN_CUENTA_INACTIVA: "Intento con cuenta inactiva",
    LOGOUT: "Cierre de sesión",
    CUENTA_BLOQUEADA: "Cuenta bloqueada",
    CUENTA_DESBLOQUEADA: "Cuenta desbloqueada",
    NOTIFICACION_DESBLOQUEO_FALLIDA: "Aviso de desbloqueo no enviado",
    CUENTA_CREADA: "Cuenta creada",
    CUENTA_EDITADA: "Cuenta editada",
    CUENTA_DESACTIVADA: "Cuenta inactivada",
    CUENTA_REACTIVADA: "Cuenta reactivada",
    ROL_CAMBIADO: "Cambio de rol de la cuenta",
    CUENTA_ROL_CAMBIADO: "Cambio de rol de la cuenta",
    PASSWORD_CAMBIADA: "Contraseña cambiada",
    PASSWORD_RESTABLECIDA: "Contraseña restablecida",
    RECUPERACION_SOLICITADA: "Recuperación de contraseña solicitada",
    RECUPERACION_EMAIL_FALLIDO: "Correo de recuperación no enviado",
    PERFIL_ACTUALIZADO: "Perfil actualizado",
    ROL_CREADO: "Rol creado",
    ROL_EDITADO: "Rol editado",
    ROL_ACTIVADO: "Rol activado",
    ROL_DESACTIVADO: "Rol desactivado",
    PERMISOS_DEFINIDOS: "Permisos actualizados",
    POLITICA_ACTUALIZADA: "Política de seguridad actualizada",
    SOLICITUD_FRECUENCIA_REGISTRADA: "Solicitud de frecuencia registrada",
    DOCUMENTO_SOLICITUD_ADJUNTADO: "Documento de solicitud de frecuencia adjuntado",
    FRECUENCIA_OTORGADA: "Frecuencia otorgada",
    RENOVACION_FRECUENCIA_INICIADA: "Renovación de frecuencia iniciada",
    FRECUENCIA_RENOVADA: "Frecuencia renovada",
    SOLICITUD_FRECUENCIA_CANCELADA: "Solicitud de frecuencia cancelada",
    ALERTA_VENCIMIENTO_GENERADA: "Alerta de vencimiento generada",
    ALERTA_VENCIMIENTO_ATENDIDA: "Alerta de vencimiento atendida",
    FRECUENCIA_VENCIDA: "Frecuencia vencida",
    CambioRol: "Cambio de rol de la cuenta",
    Creacion: "Cuenta creada",
};

export function nombreAccion(accion) {
    if (!accion) return "";
    if (ACCIONES_AUDITORIA[accion]) return ACCIONES_AUDITORIA[accion];

    const texto = accion.replace(/_/g, " ").toLowerCase();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export const ENTIDADES_AUDITORIA = {
    Usuario: "Cuenta de usuario",
    Rol: "Rol",
    Sesion: "Sesión",
    PoliticaSeguridad: "Política de seguridad",
    SolicitudFrecuencia: "Solicitud de frecuencia",
};

export function nombreEntidad(entidad) {
    return ENTIDADES_AUDITORIA[entidad] ?? entidad ?? "";
}
