const quitarTildes = (texto = "") =>
    texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const tiene = (role, lista) => lista.includes(quitarTildes(role));

const ADMIN = "administrador del sistema";
const VENDEDOR = "vendedor / ejecutivo de cuenta";

export const puedeRegistrarSolicitud = (role) => tiene(role, [ADMIN, VENDEDOR]);
export const esVendedor = (role) => tiene(role, [VENDEDOR]);
export const esAdministrador = (role) => tiene(role, [ADMIN]);
export const puedeAtenderAlerta = (role) => tiene(role, [ADMIN, VENDEDOR]);
export const puedeVerResumenFrecuencias = (role) => tiene(role, [ADMIN, "gerente"]);

export const tamano = (bytes) =>
    bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const textoDias = (dias) => (dias < 0 ? `Venció hace ${-dias} día(s)` : dias === 0 ? "Vence hoy" : `${dias} día(s)`);

export function extensionDe(nombre) {
    const i = nombre.lastIndexOf(".");
    return i < 0 ? "" : nombre.slice(i).toLowerCase();
}

export { fechaCorta, fechaHora, hoyISO } from "../inventario/helpers";
