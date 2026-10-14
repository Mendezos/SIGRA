const quitarTildes = (texto = "") =>
    texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const tiene = (role, lista) => lista.includes(quitarTildes(role));

const ADMIN = "administrador del sistema";
const VENDEDOR = "vendedor / ejecutivo de cuenta";

export const puedeRegistrarContrato = (role) => tiene(role, [ADMIN, VENDEDOR]);
export const puedeRegistrarContacto = (role) => tiene(role, [ADMIN, VENDEDOR]);
export const puedeReasignarContacto = (role) => tiene(role, [ADMIN]);
export const puedeVerContactos = (role) => tiene(role, [ADMIN, VENDEDOR, "gerente"]);
export const puedeCancelarContrato = (role) => tiene(role, [ADMIN]);
export const puedeVerAuditoria = (role) => tiene(role, [ADMIN]);
export const puedeAsignarRadio = (role) => tiene(role, [ADMIN, "coordinador tecnico", "tecnico"]);
export const puedeRegistrarFichaRepetidora = (role) => tiene(role, [ADMIN, "coordinador tecnico", "tecnico"]);

export { colones, fechaCorta, fechaHora, hoyISO } from "../inventario/helpers";

// Convierte la lista del formulario (textos) al formato que espera la API.
export const aItemsApi = (value) =>
    value.map((i) => ({ idAccesorioModelo: Number(i.idAccesorioModelo), cantidad: Number(i.cantidad) }));
