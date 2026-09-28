import { useEffect, useState } from "react";
import BrandLogo from "../components/BrandLogo";
import { validarTokenRecuperacion, restablecerPassword } from "../services/authService";

const COLORS = {
    green: "#5EB453",
    white: "#FFFFFF",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
    red: "#C0392B",
    redTint: "#FCEBEB",
    greenTint: "#EAF6E8",
};

function getTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") ?? "";
}

export default function RestablecerPassword() {
    const [token] = useState(getTokenFromUrl);
    const [estado, setEstado] = useState("validando");
    const [password, setPassword] = useState("");
    const [confirmar, setConfirmar] = useState("");
    const [error, setError] = useState("");
    const [errores, setErrores] = useState([]);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        let activo = true;

        Promise.resolve().then(() => {
            if (!token) {
                if (activo) setEstado("invalido");
                return null;
            }

            return validarTokenRecuperacion(token)
                .then(() => {
                    if (activo) setEstado("formulario");
                })
                .catch((err) => {
                    if (!activo) return;
                    setEstado("invalido");
                    setError(err.message ?? "El enlace está vencido o ya fue utilizado.");
                });
        });

        return () => {
            activo = false;
        };
    }, [token]);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setErrores([]);

        if (password !== confirmar) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        setCargando(true);
        try {
            await restablecerPassword(token, password);
            setEstado("listo");
        } catch (err) {
            setError(err.message ?? "No se pudo actualizar la contraseña.");
            setErrores(err.errores ?? []);
        } finally {
            setCargando(false);
        }
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-white px-4 py-12">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <BrandLogo centered />
                </div>

                <div
                    className="bg-white rounded-2xl p-10"
                    style={{ border: `1px solid ${COLORS.border}`, boxShadow: "0 1px 3px rgba(50,50,50,0.06)" }}
                >
                    <h1 className="text-xl mb-2" style={{ color: COLORS.charcoal, fontWeight: 600 }}>
                        Restablecer contraseña
                    </h1>

                    {estado === "validando" && (
                        <p className="text-sm mt-6" style={{ color: COLORS.muted }}>
                            Verificando el enlace...
                        </p>
                    )}

                    {estado === "invalido" && (
                        <div className="mt-6">
                            <p className="text-sm mb-6" style={{ color: COLORS.red }}>
                                {error || "El enlace está vencido o ya fue utilizado. Por favor genera una nueva solicitud."}
                            </p>
                            <a
                                href="/"
                                className="block text-center w-full py-3 rounded-lg text-sm font-medium"
                                style={{ backgroundColor: COLORS.green, color: COLORS.white, textDecoration: "none" }}
                            >
                                Ir a iniciar sesión
                            </a>
                        </div>
                    )}

                    {estado === "formulario" && (
                        <form onSubmit={handleSubmit} className="mt-6">
                            <label className="block mb-5">
                                <span className="block text-xs mb-2" style={{ color: COLORS.charcoal }}>
                                    Nueva contraseña
                                </span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-lg text-sm bg-white"
                                    style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}
                                />
                            </label>

                            <label className="block mb-5">
                                <span className="block text-xs mb-2" style={{ color: COLORS.charcoal }}>
                                    Confirmar nueva contraseña
                                </span>
                                <input
                                    type="password"
                                    value={confirmar}
                                    onChange={(e) => setConfirmar(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-lg text-sm bg-white"
                                    style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}
                                />
                            </label>

                            {error && (
                                <div className="mb-5 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: COLORS.redTint, color: COLORS.red }}>
                                    {error}
                                    {errores.length > 0 && (
                                        <ul className="list-disc ml-4 mt-1">
                                            {errores.map((e) => (
                                                <li key={e}>{e}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={cargando}
                                className="w-full py-3 rounded-lg text-sm font-medium"
                                style={{ backgroundColor: COLORS.green, color: COLORS.white, border: "none", cursor: "pointer" }}
                            >
                                {cargando ? "Actualizando..." : "Restablecer contraseña"}
                            </button>
                        </form>
                    )}

                    {estado === "listo" && (
                        <div className="text-center mt-6">
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                                style={{ backgroundColor: COLORS.greenTint, color: COLORS.green, fontSize: "1.25rem" }}
                            >
                                ✓
                            </div>
                            <p className="text-sm mb-8" style={{ color: COLORS.charcoal }}>
                                Tu contraseña se actualizó correctamente. Ya podés iniciar sesión con tu nueva contraseña.
                            </p>
                            <a
                                href="/"
                                className="block text-center w-full py-3 rounded-lg text-sm font-medium"
                                style={{ backgroundColor: COLORS.green, color: COLORS.white, textDecoration: "none" }}
                            >
                                Ir a iniciar sesión
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
