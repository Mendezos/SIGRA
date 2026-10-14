const quitarTildes = (texto = "") =>
    texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const ROLES_ESCRITURA = ["administrador del sistema", "coordinador tecnico", "tecnico"];

// Los permisos del rol (lo que el administrador define en "Roles y permisos") llegan en user.permisos.
export function tienePermiso(user, idModulo, accion) {
    const permiso = (user?.permisos ?? []).find((p) => p.idModulo === idModulo);
    return !!permiso?.[accion];
}

const MODULO_INVENTARIO = 4;

// Además del permiso del módulo, la historia limita quién puede registrar y cambiar equipos.
export function puedeEscribirInventario(user) {
    return ROLES_ESCRITURA.includes(quitarTildes(user.role)) && tienePermiso(user, MODULO_INVENTARIO, "escritura");
}

export function puedeConfigurarStock(user) {
    return ["administrador del sistema", "coordinador tecnico"].includes(quitarTildes(user.role))
        && tienePermiso(user, MODULO_INVENTARIO, "edicion");
}

export const colones = (valor) =>
    valor != null
        ? new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(valor)
        : "";

export const fechaHora = (valor) =>
    valor
        ? new Date(valor).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" })
        : "";

export const fechaCorta = (valor) =>
    valor ? new Date(valor).toLocaleDateString("es-CR", { dateStyle: "medium" }) : "";

// Fecha local (no UTC) para que después de las 6 p. m. no se adelante un día.
export const hoyISO = () => {
    const ahora = new Date();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");
    return `${ahora.getFullYear()}-${mes}-${dia}`;
};

const MAX_LADO_FOTO = 900;
const MAX_BYTES_FOTO = 6 * 1024 * 1024;

// Lee la imagen elegida y la reduce para no enviar fotos de varios MB a la API.
export function leerFoto(archivo) {
    return new Promise((resolve, reject) => {
        if (!archivo.type.startsWith("image/")) {
            reject(new Error("El archivo seleccionado no es una imagen."));
            return;
        }
        if (archivo.size > MAX_BYTES_FOTO) {
            reject(new Error("La fotografía es demasiado grande (máximo 6 MB)."));
            return;
        }

        const lector = new FileReader();
        lector.onerror = () => reject(new Error("No se pudo leer la fotografía."));
        lector.onload = () => {
            const imagen = new Image();
            imagen.onerror = () => reject(new Error("No se pudo procesar la fotografía."));
            imagen.onload = () => {
                const escala = Math.min(1, MAX_LADO_FOTO / Math.max(imagen.width, imagen.height));
                const lienzo = document.createElement("canvas");
                lienzo.width = Math.round(imagen.width * escala);
                lienzo.height = Math.round(imagen.height * escala);
                lienzo.getContext("2d").drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
                resolve(lienzo.toDataURL("image/jpeg", 0.82));
            };
            imagen.src = lector.result;
        };
        lector.readAsDataURL(archivo);
    });
}
