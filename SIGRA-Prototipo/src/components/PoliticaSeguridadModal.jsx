import { useEffect, useState } from "react";
import Modal from "./Modal";
import RecordForm from "./RecordForm";
import { obtenerPoliticaActiva, guardarPolitica } from "../services/adminService";

const COLORS = {
    charcoal: "#323232",
    muted: "#6E6E6E",
    red: "#C0392B",
    redTint: "#FCEBEB",
    greenTint: "#EAF6E8",
    greenDark: "#4CA23D",
};

const FIELDS = [
    { key: "minutosInactividad", label: "Minutos máximos de inactividad (1-240)", type: "number", required: true },
    { key: "maxIntentosFallidos", label: "Intentos fallidos máximos (3-10)", type: "number", required: true },
    { key: "longitudMinimaPassword", label: "Longitud mínima de contraseña (6-32)", type: "number", required: true },
    { key: "minutosBloqueo", label: "Minutos de bloqueo (1-1440)", type: "number", required: true },
    { key: "vigenciaEnlaceMinutos", label: "Vigencia del enlace de recuperación en minutos (5-1440)", type: "number", required: true },
];

export default function PoliticaSeguridadModal({ open, onClose }) {
    const [valoresIniciales, setValoresIniciales] = useState(null);
    const [error, setError] = useState("");
    const [errores, setErrores] = useState([]);
    const [mensaje, setMensaje] = useState("");
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        if (!open) return;

        let activo = true;

        Promise.resolve()
            .then(() => {
                if (!activo) return null;
                setError("");
                setErrores([]);
                setMensaje("");
                setValoresIniciales(null);
                setCargando(true);
                return obtenerPoliticaActiva();
            })
            .then((politica) => {
                if (!activo || !politica) return;
                setValoresIniciales({
                    minutosInactividad: String(politica.minutosInactividad),
                    maxIntentosFallidos: String(politica.maxIntentosFallidos),
                    longitudMinimaPassword: String(politica.longitudMinimaPassword),
                    minutosBloqueo: String(politica.minutosBloqueo),
                    vigenciaEnlaceMinutos: String(politica.vigenciaEnlaceMinutos),
                });
            })
            .catch((err) => {
                if (activo) setError(err.message ?? "No se pudo cargar la política actual.");
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => {
            activo = false;
        };
    }, [open]);

    if (!open) return null;

    async function handleSubmit(values) {
        setError("");
        setErrores([]);
        setMensaje("");

        try {
            await guardarPolitica({
                minutosInactividad: Number(values.minutosInactividad),
                maxIntentosFallidos: Number(values.maxIntentosFallidos),
                longitudMinimaPassword: Number(values.longitudMinimaPassword),
                minutosBloqueo: Number(values.minutosBloqueo),
                vigenciaEnlaceMinutos: Number(values.vigenciaEnlaceMinutos),
            });
            setMensaje("La política de seguridad se actualizó correctamente. Aplica a partir de ahora para las nuevas sesiones.");
        } catch (err) {
            setError(err.message ?? "No se pudo guardar la política.");
            setErrores(err.errores ?? []);
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Política de seguridad y sesión"
            subtitle="Aplica a todas las cuentas y a las futuras sesiones nuevas."
            width="max-w-2xl"
        >
            {cargando && (
                <p className="text-sm" style={{ color: COLORS.muted }}>
                    Cargando política actual...
                </p>
            )}

            {!cargando && error && (
                <div className="mb-4 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: COLORS.redTint, color: COLORS.red }}>
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

            {!cargando && mensaje && (
                <div className="mb-4 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: COLORS.greenTint, color: COLORS.greenDark }}>
                    {mensaje}
                </div>
            )}

            {!cargando && valoresIniciales && (
                <RecordForm
                    fields={FIELDS}
                    initialValues={valoresIniciales}
                    onSubmit={handleSubmit}
                    onCancel={onClose}
                    submitLabel="Guardar política"
                />
            )}
        </Modal>
    );
}
