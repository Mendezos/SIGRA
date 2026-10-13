import { apiRequest } from "./apiClient";

export async function listarRoles() {
    return apiRequest("/roles");
}

// Crea el rol junto con sus permisos en una sola operación.
export async function crearRol({ nombre, descripcion, activo, permisos }) {
    return apiRequest("/roles", {
        method: "POST",
        body: { nombre, descripcion: descripcion || null, activo, permisos },
    });
}

// Guarda nombre, descripción, estado y permisos del rol en una sola operación.
export async function guardarRol(idRol, { nombre, descripcion, activo, permisos }) {
    return apiRequest(`/roles/${idRol}`, {
        method: "PUT",
        body: { nombre, descripcion: descripcion || null, activo, permisos },
    });
}

export async function obtenerPermisosRol(idRol) {
    return apiRequest(`/roles/${idRol}/permisos`);
}

export async function listarModulos() {
    return apiRequest("/modulos");
}
