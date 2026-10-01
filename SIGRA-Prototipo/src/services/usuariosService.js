import { apiRequest } from "./apiClient";

export async function listarUsuarios() {
    return apiRequest("/usuarios");
}

export async function listarRolesAsignables() {
    return apiRequest("/usuarios/roles");
}

export async function crearUsuario({ nombre, correo, telefono, idRol, password }) {
    return apiRequest("/usuarios", {
        method: "POST",
        body: { nombre, correo, telefono: telefono || null, idRol, password },
    });
}

export async function cambiarPasswordUsuario(idUsuario, passwordNueva) {
    return apiRequest(`/usuarios/${idUsuario}/password`, {
        method: "PUT",
        body: { passwordNueva },
    });
}
