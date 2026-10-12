const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5044/api";

const TOKEN_KEY = "sigra_token";

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
    constructor(mensaje, { status, errores, minutosRestantes, codigo } = {}) {
        super(mensaje);
        this.status = status;
        this.errores = errores ?? [];
        this.minutosRestantes = minutosRestantes ?? null;
        this.codigo = codigo ?? null;
    }
}

let onSesionInvalida = null;

export function setOnSesionInvalida(callback) {
    onSesionInvalida = callback;
}

export async function apiRequest(path, { method = "GET", body, auth = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
        const token = getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
    }

    let response;
    try {
        response = await fetch(`${BASE_URL}${path}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new ApiError("No se pudo conectar con el servidor. Verificá tu conexión.", { status: 0 });
    }

    const texto = await response.text();
    let data = null;
    if (texto) {
        try {
            data = JSON.parse(texto);
        } catch {
            data = null;
        }
    }

    if (response.status === 401 && auth) {
        clearToken();
        if (onSesionInvalida) onSesionInvalida(data?.mensaje);
    }

    if (!response.ok) {
        throw new ApiError(data?.mensaje ?? "Ocurrió un error inesperado.", {
            status: response.status,
            errores: data?.errores,
            minutosRestantes: data?.minutosRestantes,
            codigo: data?.codigo,
        });
    }

    return data;
}

export async function apiDownload(path) {
    const token = getToken();
    let response;
    try { response = await fetch(`${BASE_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }); }
    catch { throw new ApiError("No se pudo conectar con el servidor.", { status: 0 }); }
    if (!response.ok) {
        const data = await response.json().catch(() => null);
        if (response.status === 401) { clearToken(); onSesionInvalida?.(data?.mensaje); }
        throw new ApiError(data?.mensaje ?? "No se pudo generar el documento.", { status: response.status, codigo: data?.codigo });
    }
    return response.blob();
}
