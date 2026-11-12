import { Pill } from "../ui";
import { COLORS } from "../uiTheme";
import { estaAbierto, etiquetaVencimiento } from "../../services/crmRecordatoriosService";

// Pendiente: espera su fecha · Notificado: ya se avisó al vendedor, falta contactar al cliente · Atendido: gestionado · Cerrado: reemplazado.
const TONOS = { Pendiente: "neutral", Notificado: "warning", Atendido: "positive", Cerrado: "neutral" };

export function BateriaEstado({ estado }) {
    return <Pill tone={TONOS[estado] ?? "neutral"}>{estado}</Pill>;
}

// "Vence hoy / Vencido hace N días / En N días": solo para los recordatorios abiertos.
export function BateriaVencimiento({ recordatorio }) {
    if (!estaAbierto(recordatorio.estado)) return null;
    const dias = recordatorio.diasRestantes;
    const color = dias < 0 ? COLORS.red : dias === 0 ? "#9C7A17" : COLORS.muted;
    return (
        <span className="block text-xs" style={{ color, fontWeight: dias <= 0 ? 600 : 400 }}>
            {etiquetaVencimiento(dias)}
        </span>
    );
}
