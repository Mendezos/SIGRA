import { useEffect, useState } from "react";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import RestablecerPassword from "./pages/RestablecerPassword";
import { obtenerPerfil, logout as logoutApi } from "./services/authService";
import { getToken, clearToken, setOnSesionInvalida } from "./services/apiClient";
import { buildUser } from "./utils/user";

const ES_RESTABLECER_PASSWORD = window.location.pathname === "/restablecer-password";
const HAY_TOKEN_INICIAL = !ES_RESTABLECER_PASSWORD && !!getToken();

export default function App() {
    const [user, setUser] = useState(null);
    const [cargando, setCargando] = useState(HAY_TOKEN_INICIAL);
    const [sesionExpirada, setSesionExpirada] = useState(false);

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

    if (!user) {
        return (
            <Auth
                avisoSesionExpirada={sesionExpirada}
                onAuthSuccess={(perfil) => {
                    setSesionExpirada(false);
                    setUser(buildUser(perfil));
                }}
            />
        );
    }

    return (
        <Dashboard
            user={user}
            onLogout={handleLogout}
            onProfileUpdated={(perfil) => setUser(buildUser(perfil))}
        />
    );
}
