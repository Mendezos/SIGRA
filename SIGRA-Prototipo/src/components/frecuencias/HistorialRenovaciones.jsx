import { useEffect, useState } from "react";
import StatusBadge from "../StatusBadge";
import { COLORS } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/frecuenciasService";
import { fechaCorta } from "./helpers";

// Historial de ciclos de la frecuencia: la solicitud original y cada renovación, en orden cronológico.
export default function HistorialRenovaciones({ idSolicitud, onVerSolicitud }) {
    const [ciclos, setCiclos] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let activo = true;
        api.obtenerHistorial(idSolicitud)
            .then((lista) => activo && setCiclos(lista))
            .catch((e) => activo && setError(e instanceof ApiError ? e.message : "No se pudo cargar el historial."));
        return () => {
            activo = false;
        };
    }, [idSolicitud]);

    return (
        <section className="mt-6">
            <h3 className="text-xs uppercase tracking-wide mb-3" style={{ color: COLORS.muted, fontWeight: 600 }}>
                Historial de renovaciones
            </h3>

            {error && <p className="text-sm" style={{ color: COLORS.red }}>{error}</p>}
            {!error && !ciclos && <p className="text-sm" style={{ color: COLORS.muted }}>Cargando historial...</p>}

            {ciclos && (
                <>
                    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: COLORS.border }}>
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ backgroundColor: "#FAFAFA", color: COLORS.muted }}>
                                    {["Ciclo", "Solicitud", "Fecha de solicitud", "Otorgamiento", "Vencimiento", "Resolución", "Estado"].map((h) => (
                                        <th key={h} className="text-left text-xs font-semibold px-3 py-2 whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ciclos.map((c) => (
                                    <tr
                                        key={c.idSolicitud}
                                        style={{ borderTop: `1px solid ${COLORS.border}`, backgroundColor: c.esActual ? COLORS.greenTint : "transparent" }}
                                    >
                                        <td className="px-3 py-2">{c.ciclo === 1 ? "1 (original)" : `${c.ciclo} (renovación)`}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            {c.esActual ? (
                                                <strong>{api.codigoSolicitud(c.idSolicitud)}</strong>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => onVerSolicitud?.(c.idSolicitud)}
                                                    className="underline"
                                                    style={{ color: COLORS.greenDark }}
                                                >
                                                    {api.codigoSolicitud(c.idSolicitud)}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">{fechaCorta(c.fechaPresentacion) || "—"}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{fechaCorta(c.fechaOtorgamiento) || "—"}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{fechaCorta(c.fechaVencimiento) || "—"}</td>
                                        <td className="px-3 py-2">{c.numeroResolucion || "—"}</td>
                                        <td className="px-3 py-2"><StatusBadge value={c.estado} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {ciclos.length === 1 && (
                        <p className="text-xs mt-2" style={{ color: COLORS.muted }}>Esta frecuencia todavía no tiene renovaciones.</p>
                    )}
                </>
            )}
        </section>
    );
}
