import { useEffect, useState } from "react";
import Modal from "./Modal";
import { Button, FieldLabel, Notice } from "./ui";
import { COLORS, inputClass, inputStyle } from "./uiTheme";
import { obtenerCuentasBloqueadas, desbloquearCuenta } from "../services/adminService";

function iniciales(nombre = "") {
    return nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
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
            {mensaje && <Notice>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            {cargando && (
                <p className="text-sm" style={{ color: COLORS.muted }}>
                    Cargando cuentas bloqueadas...
                </p>
            )}

            {!cargando && cuentas.length === 0 && !error && (
                <div
                    className="rounded-xl p-8 text-center"
                    style={{ backgroundColor: COLORS.greenTint }}
                >
                    <p className="text-sm font-semibold" style={{ color: COLORS.greenDark }}>
                        No hay cuentas bloqueadas
                    </p>
                    <p className="text-xs mt-1" style={{ color: COLORS.muted }}>
                        Todas las cuentas pueden iniciar sesión con normalidad.
                    </p>
                </div>
            )}

            {!cargando && cuentas.length > 0 && (
                <div className="flex flex-col gap-3">
                    {cuentas.map((cuenta) => (
                        <div
                            key={cuenta.idUsuario}
                            className="rounded-xl p-4"
                            style={{ border: `1px solid ${COLORS.border}` }}
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm"
                                        style={{ backgroundColor: COLORS.redTint, color: COLORS.red, fontWeight: 600 }}
                                    >
                                        {iniciales(cuenta.nombre)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm truncate" style={{ color: COLORS.charcoal, fontWeight: 600 }}>
                                            {cuenta.nombre}
                                        </p>
                                        <p className="text-xs truncate" style={{ color: COLORS.muted }}>
                                            {cuenta.correo}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            <span className="px-2 py-0.5 rounded-md text-xs" style={{ backgroundColor: COLORS.redTint, color: COLORS.red }}>
                                                {cuenta.intentosFallidos} intentos fallidos
                                            </span>
                                            {cuenta.bloqueadoHasta && (
                                                <span className="px-2 py-0.5 rounded-md text-xs" style={{ backgroundColor: "#F1F1F1", color: COLORS.muted }}>
                                                    Hasta {new Date(cuenta.bloqueadoHasta).toLocaleString("es-CR")}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    variant={filaAbierta === cuenta.idUsuario ? "ghost" : "primary"}
                                    onClick={() => handleAbrirFila(cuenta.idUsuario)}
                                    disabled={!cuenta.activo}
                                    className="shrink-0"
                                >
                                    {filaAbierta === cuenta.idUsuario ? "Cancelar" : "Desbloquear"}
                                </Button>
                            </div>

                            {!cuenta.activo && (
                                <p className="text-xs mt-3" style={{ color: COLORS.red }}>
                                    Cuenta inactiva: debe reactivarla antes de poder desbloquearla.
                                </p>
                            )}

                            {filaAbierta === cuenta.idUsuario && (
                                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                                    {cuenta.intentosRecientes?.length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-xs uppercase tracking-wide mb-2" style={{ color: COLORS.muted, fontWeight: 600 }}>
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

                                    <FieldLabel label="Motivo del desbloqueo">
                                        <textarea
                                            value={motivo}
                                            onChange={(e) => setMotivo(e.target.value)}
                                            rows={2}
                                            className={inputClass}
                                            style={inputStyle}
                                        />
                                    </FieldLabel>

                                    <div className="flex justify-end mt-3">
                                        <Button
                                            variant="primary"
                                            onClick={() => handleDesbloquear(cuenta.idUsuario)}
                                            disabled={accionCargando}
                                        >
                                            {accionCargando ? "Desbloqueando..." : "Confirmar desbloqueo"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}
