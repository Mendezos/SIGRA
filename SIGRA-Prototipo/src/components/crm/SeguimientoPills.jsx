import { Pill } from "../ui";

const TONO_ESTADO = { Pendiente: "warning", Atrasado: "negative", Completado: "positive", Cancelado: "neutral", Activa: "positive", Cancelada: "neutral" };
const TONO_PRIORIDAD = { Alta: "negative", Media: "warning", Baja: "neutral" };

// Etiqueta de color del estado de un seguimiento (Pendiente, Atrasado, Completado, Cancelado) o de una serie (Activa, Cancelada).
export function SeguimientoEstadoPill({ estado }) {
    return <Pill tone={TONO_ESTADO[estado] ?? "neutral"}>{estado}</Pill>;
}

export function SeguimientoPrioridadPill({ prioridad }) {
    return <Pill tone={TONO_PRIORIDAD[prioridad] ?? "neutral"}>{prioridad}</Pill>;
}
