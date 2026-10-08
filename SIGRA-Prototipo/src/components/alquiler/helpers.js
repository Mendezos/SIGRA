const quitarTildes = (texto = "") =>
    texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const tiene = (role, lista) => lista.includes(quitarTildes(role));

const ADMIN = "administrador del sistema";
const VENDEDOR = "vendedor / ejecutivo de cuenta";

export const puedeRegistrarContrato = (role) => tiene(role, [ADMIN, VENDEDOR]);
export const puedeRegistrarContacto = (role) => tiene(role, [ADMIN, VENDEDOR]);
export const puedeReasignarContacto = (role) => tiene(role, [ADMIN]);
export const puedeVerContactos = (role) => tiene(role, [ADMIN, VENDEDOR, "gerente"]);
export const puedeAsignarRadio = (role) => tiene(role, [ADMIN, "coordinador tecnico", "tecnico"]);

export { colones, fechaCorta, fechaHora, hoyISO } from "../inventario/helpers";
