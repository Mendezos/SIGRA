import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { COLORS } from "../uiTheme";
import * as api from "../../services/frecuenciasService";
import { fechaCorta } from "./helpers";

// Indicador visual del dashboard administrativo: estado de las frecuencias y las que están en alerta final (urgentes).
export default function FrecuenciasDashboardWidget() {
    const [resumen, setResumen] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let activo = true;
        api.obtenerResumen()
            .then((r) => activo && setResumen(r))
            .catch(() => activo && setError(true));
        return () => {
            activo = false;
        };
    }, []);

    if (error) return null;
    if (!resumen) return null;

    const tarjetas = [
        { label: "Frecuencias vigentes", value: resumen.vigentes },
        { label: "Por renovar", value: resumen.porRenovar },
        { label: "En renovación", value: resumen.enRenovacion },
        { label: "Urgentes (30 días)", value: resumen.urgentes, urgente: resumen.urgentes > 0 },
        { label: "Vencidas sin renovación", value: resumen.vencidasSinRenovacion, urgente: resumen.vencidasSinRenovacion > 0 },
        { label: "Alertas pendientes", value: resumen.alertasPendientes },
    ];

    return (
        <section className="rounded-xl p-5 mb-6" style={{ border: `1px solid ${COLORS.border}` }}>
            <h2 className="text-sm mb-4" style={{ fontWeight: 600, color: COLORS.charcoal }}>Vencimiento de frecuencias de radio</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {tarjetas.map((t) => (
                    <div
                        key={t.label}
                        className="rounded-lg p-3"
                        style={{ backgroundColor: t.urgente ? COLORS.redTint : COLORS.greenTint, border: t.urgente ? `1px solid ${COLORS.red}` : "1px solid transparent" }}
                    >
                        <p className="text-xs mb-1" style={{ color: t.urgente ? COLORS.red : COLORS.muted }}>{t.label}</p>
                        <p className="text-2xl" style={{ fontWeight: 600, color: t.urgente ? COLORS.red : COLORS.charcoal }}>{t.value}</p>
                    </div>
                ))}
            </div>

            {resumen.frecuenciasUrgentes.length > 0 && (
                <ul className="mt-4 space-y-2">
                    {resumen.frecuenciasUrgentes.map((u) => (
                        <li
                            key={u.idAlerta}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-4 py-2.5 text-sm"
                            style={{ backgroundColor: COLORS.redTint, color: COLORS.red, border: `1px solid ${COLORS.red}` }}
                        >
                            <AlertTriangle size={16} className="shrink-0" />
                            <strong>{u.empresa}</strong>
                            <span>{u.frecuencia} · repetidora {u.numeroSerie}</span>
                            <span>vence el {fechaCorta(u.fechaVencimiento)} ({u.diasRestantes} días)</span>
                            <span className="ml-auto">{u.vendedor}{u.atendida ? " · alerta atendida" : ""}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
