import { useEffect, useState } from "react";
import Modal from "./Modal";
import { obtenerCuentasBloqueadas, desbloquearCuenta } from "../services/adminService";

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

export default function DesbloquearCuentaModal({ open, onClose }) {
    const [cuentas, setCuentas] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [filaAbierta, setFilaAbierta] = useState(null);
    const [motivo, setMotivo] = useState("");
    const [accionCargando, setAccionCargando] = useState(false);

    function cargarCuentas() {
        setCargando(true);
        setError("");
        return obtenerCuentasBloqueadas()
            .then((data) => setCuentas(data))
            .catch((err) => setError(err.message ?? "No se pudo cargar la lista de cuentas bloqueadas."))
            .finally(() => setCargando(false));
    }

    useEffect(() => {
        if (!open) return;

        let activo = true;

        Promise.resolve().then(() => {
            if (!activo) return;
            setMensaje("");
            setError("");
            setFilaAbierta(null);
            setMotivo("");
            cargarCuentas();
        });

        return () => {
            activo = false;
        };
    }, [open]);

    if (!open) return null;

    function handleClose() {
        setFilaAbierta(null);
        setMotivo("");
        setError("");
        setMensaje("");
        onClose();
    }

    function handleAbrirFila(idUsuario) {
        setError("");
        setMensaje("");
        setMotivo("");
        setFilaAbierta((actual) => (actual === idUsuario ? null : idUsuario));
    }

    async function handleDesbloquear(idUsuario) {
        setError("");

        if (!motivo.trim()) {
            setError("Debe indicar el motivo del desbloqueo.");
            return;
        }

        setAccionCargando(true);
        try {
            await desbloquearCuenta(idUsuario, motivo.trim());
            setMensaje("Cuenta desbloqueada correctamente. Se notificó al usuario por correo.");
            setFilaAbierta(null);
            setMotivo("");
            await cargarCuentas();
        } catch (err) {
            setError(err.message ?? "No se pudo desbloquear la cuenta.");
        } finally {
            setAccionCargando(false);
        }
    }

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title="Cuentas bloqueadas"
            subtitle="Verificá los intentos recientes y registrá el motivo antes de desbloquear."
            width="max-w-2xl"
        >
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

            {cargando && (
                <p className="text-sm" style={{ color: COLORS.muted }}>
                    Cargando cuentas bloqueadas...
                </p>
            )}

            {!cargando && cuentas.length === 0 && !error && (
                <p className="text-sm" style={{ color: COLORS.muted }}>
                    No hay cuentas bloqueadas en este momento.
                </p>
            )}

            {!cargando && cuentas.length > 0 && (
                <div className="flex flex-col gap-3 max-h-[28rem] overflow-y-auto pr-1">
                    {cuentas.map((cuenta) => (
                        <div key={cuenta.idUsuario} className="rounded-xl p-4" style={{ border: `1px solid ${COLORS.border}` }}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate" style={{ color: COLORS.charcoal }}>
                                        {cuenta.nombre}
                                    </p>
                                    <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.muted }}>
                                        {cuenta.correo}
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: COLORS.muted }}>
                                        Intentos fallidos: {cuenta.intentosFallidos}
                                        {cuenta.bloqueadoHasta && (
                                            <> · Bloqueada hasta {new Date(cuenta.bloqueadoHasta).toLocaleString("es-CR")}</>
                                        )}
                                    </p>
                                    {!cuenta.activo && (
                                        <p className="text-xs mt-1 font-medium" style={{ color: COLORS.red }}>
                                            Cuenta inactiva — debe reactivarla antes de poder desbloquearla.
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleAbrirFila(cuenta.idUsuario)}
                                    disabled={!cuenta.activo}
                                    className="shrink-0 px-3.5 py-2 rounded-lg text-xs font-medium"
                                    style={{
                                        backgroundColor: cuenta.activo ? COLORS.green : COLORS.border,
                                        color: cuenta.activo ? COLORS.white : COLORS.muted,
                                        border: "none",
                                        cursor: cuenta.activo ? "pointer" : "not-allowed",
                                    }}
                                >
                                    {filaAbierta === cuenta.idUsuario ? "Cancelar" : "Desbloquear"}
                                </button>
                            </div>

                            {filaAbierta === cuenta.idUsuario && (
                                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                                    {cuenta.intentosRecientes?.length > 0 && (
                                        <div className="mb-3">
                                            <p className="text-xs font-semibold mb-1" style={{ color: COLORS.charcoal }}>
                                                Intentos recientes
                                            </p>
                                            <ul className="text-xs space-y-1 max-h-24 overflow-y-auto" style={{ color: COLORS.muted }}>
                                                {cuenta.intentosRecientes.map((intento, idx) => (
                                                    <li key={idx}>
                                                        {new Date(intento.fecha).toLocaleString("es-CR")} — {intento.accion}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <label className="block mb-3">
                                        <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>
                                            Motivo del desbloqueo
                                        </span>
                                        <textarea
                                            value={motivo}
                                            onChange={(e) => setMotivo(e.target.value)}
                                            rows={2}
                                            className={inputClass()}
                                            style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}
                                        />
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => handleDesbloquear(cuenta.idUsuario)}
                                        disabled={accionCargando}
                                        className="px-5 py-2.5 rounded-lg text-sm font-medium"
                                        style={{ backgroundColor: COLORS.green, color: COLORS.white, border: "none" }}
                                    >
                                        {accionCargando ? "Desbloqueando..." : "Confirmar desbloqueo"}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}
