import { apiRequest } from "./apiClient";

export async function obtenerEstadoCuenta(idUsuario) {
    return apiRequest(`/cuentas/${idUsuario}/estado`);
}

export async function obtenerCuentasBloqueadas() {
    return apiRequest("/cuentas/bloqueadas");
}

export async function desbloquearCuenta(idUsuario, motivo) {
    return apiRequest(`/cuentas/${idUsuario}/desbloquear`, {
        method: "POST",
        body: { motivo },
    });
}
