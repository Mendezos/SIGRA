import { apiRequest } from "./apiClient";

export async function listarRoles() {
    return apiRequest("/roles");
}

export async function crearRol(nombre) {
    return apiRequest("/roles", {
        method: "POST",
        body: { nombre },
    });
}

export async function editarRol(idRol, nombre) {
    return apiRequest(`/roles/${idRol}`, {
        method: "PUT",
        body: { nombre },
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
