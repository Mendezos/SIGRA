const quitarTildes = (texto = "") =>
    texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const tiene = (role, lista) => lista.includes(quitarTildes(role));

const ADMIN = "administrador del sistema";
const VENDEDOR = "vendedor / ejecutivo de cuenta";
const RECEPCION = "recepcionista";
const TECNICOS = ["coordinador tecnico", "tecnico"];
const MODULO_ALQUILER = 3;

// Cada función combina el rol que la historia permite con el permiso que el administrador dio a ese rol en el módulo.
const permitido = (user, roles, accion) =>
    tiene(user.role, roles) && tienePermiso(user, MODULO_ALQUILER, accion);

export const puedeRegistrarContrato = (user) => permitido(user, [ADMIN, VENDEDOR], "escritura");
export const puedeRegistrarContacto = (user) => permitido(user, [ADMIN, VENDEDOR, RECEPCION], "escritura");
export const puedeReasignarContacto = (user) => permitido(user, [ADMIN], "edicion");
export const puedeVerContactos = (user) => permitido(user, [ADMIN, VENDEDOR, RECEPCION, "gerente"], "lectura");
export const puedeCancelarContrato = (user) => permitido(user, [ADMIN], "escritura");
export const puedeVerAuditoria = (user) => permitido(user, [ADMIN], "lectura");
export const puedeAsignarRadio = (user) => permitido(user, [ADMIN, ...TECNICOS], "escritura");
export const puedeRegistrarFichaRepetidora = (user) => permitido(user, [ADMIN, ...TECNICOS], "escritura");
// La recepción solo atiende contactos: no ve contratos, radios ni repetidoras.
export const puedeVerContratos = (user) => !tiene(user.role, [RECEPCION]) && tienePermiso(user, MODULO_ALQUILER, "lectura");

export { colones, fechaCorta, fechaHora, hoyISO, tienePermiso } from "../inventario/helpers";
import { tienePermiso } from "../inventario/helpers";

// Convierte la lista del formulario (textos) al formato que espera la API.
export const aItemsApi = (value) =>
    value.map((i) => ({ idAccesorioModelo: Number(i.idAccesorioModelo), cantidad: Number(i.cantidad) }));
