import { useEffect, useState } from "react";
import { KeyRound, UserCog } from "lucide-react";
import Modal from "./Modal";
import { Button, Notice } from "./ui";
import { COLORS, inputClass, inputStyle } from "./uiTheme";
import { obtenerPerfil, actualizarPerfil, cambiarPassword } from "../services/authService";


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

        let activo = true;
        Promise.resolve().then(() => {
            if (!activo) return;
            setError("");
            setMensaje("");
            setPasswordActual("");
            setPasswordNueva("");
            setPasswordConfirmar("");
            setCargando(true);
        });

        obtenerPerfil()
            .then((perfil) => {
                setNombre(perfil.nombre ?? "");
                setTelefono(perfil.telefono ?? "");
                setCorreo(perfil.correo ?? "");
                setRol(perfil.rol ?? "");
            })
            .catch((err) => setError(err.message ?? "No se pudo cargar tu perfil."))
            .finally(() => setCargando(false));

        return () => {
            activo = false;
        };
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

    const campoSoloLectura = {
        ...inputStyle,
        backgroundColor: "#F7F7F7",
        color: COLORS.muted,
    };

    const tarjeta = {
        border: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.white,
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Mi perfil"
            subtitle="Actualice sus datos o cambie su contraseña."
            icon={UserCog}
            width="max-w-lg"
        >
            {mensaje && <Notice>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            {cargando ? (
                <p className="text-sm" role="status" style={{ color: COLORS.muted }}>Cargando su perfil...</p>
            ) : (
                <div className="flex flex-col gap-5">
                    <form onSubmit={handleGuardarPerfil} className="rounded-xl p-5" style={tarjeta}>
                        <h3 className="flex items-center gap-2 text-sm mb-4" style={{ color: COLORS.charcoal, fontWeight: 600 }}>
                            <UserCog size={16} color={COLORS.greenDark} /> Datos personales
                        </h3>

                        <div className="grid grid-cols-1 gap-3 mb-3">
                            <label className="block">
                                <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Correo</span>
                                <input value={correo} disabled readOnly className={inputClass} style={campoSoloLectura} />
                            </label>

                            <label className="block">
                                <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Rol</span>
                                <input value={rol} disabled readOnly className={inputClass} style={campoSoloLectura} />
                            </label>
                        </div>

                        <label className="block mb-3">
                            <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Nombre completo</span>
                            <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={150} required className={inputClass} style={inputStyle} />
                        </label>

                        <label className="block mb-4">
                            <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Teléfono</span>
                            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} maxLength={20} className={inputClass} style={inputStyle} />
                        </label>

                        <div className="flex justify-end">
                            <Button variant="primary" type="submit" disabled={guardandoPerfil}>
                                {guardandoPerfil ? "Guardando..." : "Guardar cambios"}
                            </Button>
                        </div>
                    </form>

                    <form onSubmit={handleCambiarPassword} className="rounded-xl p-5" style={tarjeta}>
                        <h3 className="flex items-center gap-2 text-sm mb-1" style={{ color: COLORS.charcoal, fontWeight: 600 }}>
                            <KeyRound size={16} color={COLORS.greenDark} /> Cambiar contraseña
                        </h3>
                        <p className="text-xs mb-4" style={{ color: COLORS.muted }}>
                            Al cambiarla se cerrarán todas sus sesiones y deberá iniciar sesión de nuevo.
                        </p>

                        <label className="block mb-3">
                            <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Contraseña actual</span>
                            <input type="password" autoComplete="current-password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} required className={inputClass} style={inputStyle} />
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <label className="block">
                                <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Contraseña nueva</span>
                                <input type="password" autoComplete="new-password" value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} required className={inputClass} style={inputStyle} />
                            </label>

                            <label className="block">
                                <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Confirmar contraseña</span>
                                <input type="password" autoComplete="new-password" value={passwordConfirmar} onChange={(e) => setPasswordConfirmar(e.target.value)} required className={inputClass} style={inputStyle} />
                            </label>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={cambiandoPassword}>
                                {cambiandoPassword ? "Cambiando..." : "Cambiar contraseña"}
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </Modal>
    );
}
