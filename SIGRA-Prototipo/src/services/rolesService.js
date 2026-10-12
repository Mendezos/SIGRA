import { apiRequest } from "./apiClient";

export async function listarRoles() {
    return apiRequest("/roles");
}

export async function crearRol(nombre, descripcion) {
    return apiRequest("/roles", {
        method: "POST",
        body: { nombre, descripcion: descripcion || null },
    });
}

export async function editarRol(idRol, nombre, descripcion) {
    return apiRequest(`/roles/${idRol}`, {
        method: "PUT",
        body: { nombre, descripcion: descripcion || null },
    });
}

export async function cambiarEstadoRol(idRol, activo) {
    return apiRequest(`/roles/${idRol}/estado`, {
        method: "PATCH",
        body: { activo },
    });
}

export async function obtenerPermisosRol(idRol) {
    return apiRequest(`/roles/${idRol}/permisos`);
}

export async function definirPermisosRol(idRol, permisos) {
    return apiRequest(`/roles/${idRol}/permisos`, {
        method: "PUT",
        body: permisos,
    });
}

export async function listarModulos() {
    return apiRequest("/modulos");
}
