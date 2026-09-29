import { useEffect, useState } from "react";
import Modal from "./Modal";
import { obtenerPerfil, actualizarPerfil, cambiarPassword } from "../services/authService";

const COLORS = {
    green: "#5EB453",
    greenDark: "#4CA23D",
    greenTint: "#EAF6E8",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
    red: "#C0392B",
    redTint: "#FCEBEB",
    white: "#FFFFFF",
};

function inputClass() {
    return "w-full px-3.5 py-2.5 rounded-lg text-sm bg-white outline-none";
}

const inputStyle = { border: `1px solid ${COLORS.border}`, color: COLORS.charcoal };

export default function PerfilModal({ open, onClose, onProfileUpdated, onLogout }) {
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");

    const [nombre, setNombre] = useState("");
    const [telefono, setTelefono] = useState("");
    const [correo, setCorreo] = useState("");
    const [rol, setRol] = useState("");
    const [guardandoPerfil, setGuardandoPerfil] = useState(false);

    const [passwordActual, setPasswordActual] = useState("");
    const [passwordNueva, setPasswordNueva] = useState("");
    const [passwordConfirmar, setPasswordConfirmar] = useState("");
    const [cambiandoPassword, setCambiandoPassword] = useState(false);

    useEffect(() => {
        if (!open) return;

        setError("");
        setMensaje("");
        setPasswordActual("");
        setPasswordNueva("");
        setPasswordConfirmar("");
        setCargando(true);

        obtenerPerfil()
            .then((perfil) => {
                setNombre(perfil.nombre ?? "");
                setTelefono(perfil.telefono ?? "");
                setCorreo(perfil.correo ?? "");
                setRol(perfil.rol ?? "");
            })
            .catch((err) => setError(err.message ?? "No se pudo cargar tu perfil."))
            .finally(() => setCargando(false));
    }, [open]);

    if (!open) return null;

    async function handleGuardarPerfil(e) {
        e.preventDefault();
        setError("");
        setMensaje("");
        setGuardandoPerfil(true);
        try {
            const actualizado = await actualizarPerfil(nombre, telefono || null, null);
            setMensaje("Perfil actualizado correctamente.");
            onProfileUpdated?.(actualizado);
        } catch (err) {
            setError(err.message ?? "No se pudo actualizar el perfil.");
        } finally {
            setGuardandoPerfil(false);
        }
    }

    async function handleCambiarPassword(e) {
        e.preventDefault();
        setError("");
        setMensaje("");

        if (passwordNueva !== passwordConfirmar) {
            setError("La confirmación no coincide con la nueva contraseña.");
            return;
        }

        setCambiandoPassword(true);
        try {
            await cambiarPassword(passwordActual, passwordNueva);
            setMensaje("Contraseña actualizada. Vas a iniciar sesión de nuevo por seguridad.");
            setTimeout(() => {
                onClose();
                onLogout?.();
            }, 1500);
        } catch (err) {
            setError(err.message ?? "No se pudo cambiar la contraseña.");
        } finally {
            setCambiandoPassword(false);
        }
    }

    return (
        <Modal open={open} onClose={onClose} title="Mi perfil" subtitle="Actualizá tus datos o cambiá tu contraseña." width="max-w-lg">
            {mensaje && (
                <div className="mb-4 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: COLORS.greenTint, color: COLORS.greenDark }}>
                    {mensaje}
                </div>
            )}
            {error && (
                <div className="mb-4 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: COLORS.redTint, color: COLORS.red }}>
                    {error}
                </div>
            )}

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando tu perfil...</p>
            ) : (
                <>
                    <form onSubmit={handleGuardarPerfil} className="mb-6 pb-6" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                        <p className="text-sm font-semibold mb-3" style={{ color: COLORS.charcoal }}>Datos personales</p>

                        <label className="block mb-3">
                            <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Correo</span>
                            <input value={correo} disabled className={inputClass()} style={{ ...inputStyle, backgroundColor: COLORS.greenTint, color: COLORS.muted }} />
                        </label>

                        <label className="block mb-3">
                            <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Rol</span>
                            <input value={rol} disabled className={inputClass()} style={{ ...inputStyle, backgroundColor: COLORS.greenTint, color: COLORS.muted }} />
                        </label>

                        <label className="block mb-3">
                            <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Nombre completo</span>
                            <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={150} required className={inputClass()} style={inputStyle} />
                        </label>

                        <label className="block mb-4">
                            <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Teléfono</span>
                            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} maxLength={20} className={inputClass()} style={inputStyle} />
                        </label>

                        <button
                            type="submit"
                            disabled={guardandoPerfil}
                            className="px-5 py-2.5 rounded-lg text-sm font-medium"
                            style={{ backgroundColor: COLORS.green, color: COLORS.white, border: "none" }}
                        >
                            {guardandoPerfil ? "Guardando..." : "Guardar cambios"}
                        </button>
                    </form>

                    <form onSubmit={handleCambiarPassword}>
                        <p className="text-sm font-semibold mb-3" style={{ color: COLORS.charcoal }}>Cambiar contraseña</p>

                        <label className="block mb-3">
                            <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Contraseña actual</span>
                            <input type="password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} required className={inputClass()} style={inputStyle} />
                        </label>

                        <label className="block mb-3">
                            <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Contraseña nueva</span>
                            <input type="password" value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} required className={inputClass()} style={inputStyle} />
                        </label>

                        <label className="block mb-4">
                            <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Confirmar contraseña nueva</span>
                            <input type="password" value={passwordConfirmar} onChange={(e) => setPasswordConfirmar(e.target.value)} required className={inputClass()} style={inputStyle} />
                        </label>

                        <button
                            type="submit"
                            disabled={cambiandoPassword}
                            className="px-5 py-2.5 rounded-lg text-sm font-medium"
                            style={{ backgroundColor: COLORS.charcoal, color: COLORS.white, border: "none" }}
                        >
                            {cambiandoPassword ? "Cambiando..." : "Cambiar contraseña"}
                        </button>
                    </form>
                </>
            )}
        </Modal>
    );
}
