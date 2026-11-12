import { tienePermiso } from "../inventario/helpers";

const MODULO_CONTRATOS = 7;
const quitarTildes = (texto = "") => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const rol = (user) => quitarTildes(user.role);

// Las plantillas las administra el administrador; vendedores y gerencia las consultan.
export const puedeAdministrarPlantillas = (user) => rol(user) === "administrador del sistema" && tienePermiso(user, MODULO_CONTRATOS, "escritura");
export const puedeVerPlantillas = (user) =>
    ["administrador del sistema", "vendedor / ejecutivo de cuenta", "gerente"].includes(rol(user)) && tienePermiso(user, MODULO_CONTRATOS, "lectura");
