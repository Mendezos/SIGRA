import { useEffect, useState } from "react";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import RestablecerPassword from "./pages/RestablecerPassword";
import { obtenerPerfil, logout as logoutApi } from "./services/authService";
import { getToken, clearToken, setOnSesionInvalida, TOKEN_KEY } from "./services/apiClient";
import { buildUser } from "./utils/user";

const ES_RESTABLECER_PASSWORD = window.location.pathname === "/restablecer-password";
const HAY_TOKEN_INICIAL = !ES_RESTABLECER_PASSWORD && !!getToken();
const CLAVE_AVISO = "sigra_aviso_sesion";

// Si el aviso quedó guardado antes de recargar, se muestra una vez y se borra.
function leerAviso() {
    try {
        const aviso = sessionStorage.getItem(CLAVE_AVISO);
        if (aviso) sessionStorage.removeItem(CLAVE_AVISO);
        return aviso ?? "";
    } catch {
        return "";
    }
}

export default function App() {
    const [user, setUser] = useState(null);
    const [cargando, setCargando] = useState(HAY_TOKEN_INICIAL);
    const [sesionExpirada, setSesionExpirada] = useState(false);
    const [avisoPestanas, setAvisoPestanas] = useState(leerAviso);

    // La sesión se guarda en el navegador y es compartida por todas las pestañas. Si otra pestaña inicia, cierra o cambia
    // la sesión, esta se recarga para mostrar la misma cuenta; así ninguna pestaña actúa con una cuenta distinta a la que muestra.
    useEffect(() => {
        if (ES_RESTABLECER_PASSWORD) return undefined;

        function alCambiarAlmacenamiento(evento) {
            if (evento.key !== null && evento.key !== TOKEN_KEY) return;
            try {
                sessionStorage.setItem(CLAVE_AVISO, "La sesión cambió en otra pestaña. Esta pestaña ahora usa la misma sesión.");
            } catch {
                // sin sessionStorage: se recarga igual, solo sin aviso
            }
            window.location.reload();
        }

        window.addEventListener("storage", alCambiarAlmacenamiento);
        return () => window.removeEventListener("storage", alCambiarAlmacenamiento);
    }, []);

    useEffect(() => {
        if (!avisoPestanas) return undefined;
        const temporizador = setTimeout(() => setAvisoPestanas(""), 7000);
        return () => clearTimeout(temporizador);
    }, [avisoPestanas]);

    useEffect(() => {
        setOnSesionInvalida(() => {
            setUser(null);
            setSesionExpirada(true);
        });
    }, []);

    useEffect(() => {
        if (!HAY_TOKEN_INICIAL) return;

        obtenerPerfil()
            .then((perfil) => setUser(buildUser(perfil)))
            .catch(() => clearToken())
            .finally(() => setCargando(false));
    }, []);

    if (ES_RESTABLECER_PASSWORD) {
        return <RestablecerPassword />;
    }

    if (cargando) {
        return null;
    }

    async function handleLogout() {
        try {
            await logoutApi();
        } catch {
            // Si ya expiró o falla la red, igual cerramos la sesión localmente.
        }
        setUser(null);
    }

    const banner = avisoPestanas ? (
        <div
            role="status"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl text-sm shadow-lg"
            style={{ backgroundColor: "#EAF6E8", color: "#323232", border: "1px solid #5EB453" }}
        >
            {avisoPestanas}
        </div>
    ) : null;

    if (!user) {
        return (
            <>
                {banner}
                <Auth
                    avisoSesionExpirada={sesionExpirada}
                    onAuthSuccess={(perfil) => {
                        setSesionExpirada(false);
                        setUser(buildUser(perfil));
                    }}
                />
            </>
        );
    }

    return (
        <>
            {banner}
            <Dashboard
                user={user}
                onLogout={handleLogout}
                onProfileUpdated={(perfil) => setUser(buildUser(perfil))}
            />
        </>
    );
}
