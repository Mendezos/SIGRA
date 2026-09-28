import { apiRequest, setToken, clearToken } from "./apiClient";

export async function login(correo, password) {
    const data = await apiRequest("/auth/login", {
        method: "POST",
        body: { correo, password },
        auth: false,
    });
    setToken(data.token);
    return data;
}

export async function logout() {
    try {
        await apiRequest("/auth/logout", { method: "POST" });
    } finally {
        clearToken();
    }
}

export async function obtenerPerfil() {
    return apiRequest("/auth/me");
}

export async function solicitarRecuperacion(correo) {
    return apiRequest("/recuperacion-password/solicitar", {
        method: "POST",
        body: { correo },
        auth: false,
    });
}

export async function validarTokenRecuperacion(token) {
    return apiRequest(`/recuperacion-password/validar/${encodeURIComponent(token)}`, { auth: false });
}

export async function restablecerPassword(token, nuevaPassword) {
    return apiRequest("/recuperacion-password/restablecer", {
        method: "POST",
        body: { token, nuevaPassword },
        auth: false,
    });
}
