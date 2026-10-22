const quitarTildes = (texto = "") =>
    texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

import { tienePermiso } from "../inventario/helpers";

const tiene = (role, lista) => lista.includes(quitarTildes(role));

const ADMIN = "administrador del sistema";
const VENDEDOR = "vendedor / ejecutivo de cuenta";

// Cada función combina el rol que la historia permite con el permiso que el administrador dio a ese rol en el módulo.
const MODULO_FRECUENCIAS = 11;
const permitido = (user, roles, accion) => tiene(user.role, roles) && tienePermiso(user, MODULO_FRECUENCIAS, accion);

export const puedeRegistrarSolicitud = (user) => permitido(user, [ADMIN, VENDEDOR], "escritura");
export const esVendedor = (role) => tiene(role, [VENDEDOR]);
export const esAdministrador = (role) => tiene(role, [ADMIN]);
export const puedeAtenderAlerta = (user) => permitido(user, [ADMIN, VENDEDOR], "escritura");
export const puedeVerResumenFrecuencias = (user) => permitido(user, [ADMIN, "gerente"], "lectura");

export const tamano = (bytes) =>
    bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const textoDias = (dias) => (dias < 0 ? `Venció hace ${-dias} día(s)` : dias === 0 ? "Vence hoy" : `${dias} día(s)`);

export function extensionDe(nombre) {
    const i = nombre.lastIndexOf(".");
    return i < 0 ? "" : nombre.slice(i).toLowerCase();
}

export { fechaCorta, fechaHora, hoyISO } from "../inventario/helpers";
