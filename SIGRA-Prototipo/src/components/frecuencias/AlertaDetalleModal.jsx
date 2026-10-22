import { useState } from "react";
import { Activity, AlertTriangle, BellRing, Building2, CalendarClock, CheckCircle2, Hourglass, Mail, Radio, UserRound, Waves } from "lucide-react";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { Button, DetailGrid, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/frecuenciasService";
import { fechaCorta, fechaHora, textoDias } from "./helpers";

// Mismo mensaje que devuelve el servidor, para avisar antes de enviar.
const MENSAJE_SIN_NOTA = "Debe ingresar una nota describiendo las acciones tomadas";

export default function AlertaDetalleModal({ alerta: a, canAtender, onVerSolicitud, onAtendida, onClose }) {
    const [nota, setNota] = useState("");
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    async function atender(e) {
        e.preventDefault();
        setError("");
        if (!nota.trim()) return setError(MENSAJE_SIN_NOTA);

        setGuardando(true);
        try {
            onAtendida(await api.atenderAlerta(a.idAlerta, nota));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo marcar la alerta como atendida.");
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={`Alerta de vencimiento · ${api.codigoSolicitud(a.idSolicitud)}`}
            subtitle={`${a.empresa} · ${a.frecuencia}`}
            icon={BellRing}
            tone={a.urgente && !a.atendida ? "danger" : "default"}
            width="max-w-2xl"
            footer={
                <div className="flex justify-between gap-3">
                    <Button onClick={onVerSolicitud}>Ver solicitud</Button>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
                        {canAtender && !a.atendida && (
                            <Button variant="primary" type="submit" form="form-atender-alerta" disabled={guardando}>
                                {guardando ? "Guardando..." : "Marcar como atendida"}
                            </Button>
                        )}
                    </div>
                </div>
            }
        >
            <div className="flex items-center gap-3 mb-5">
                {a.urgente ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs" style={{ backgroundColor: COLORS.redTint, color: COLORS.red, fontWeight: 700 }}>
                        <AlertTriangle size={14} /> URGENTE
                    </span>
                ) : null}
                <span className="text-sm" style={{ fontWeight: 600, color: COLORS.charcoal }}>{api.TIPOS_ALERTA[a.tipo] ?? a.tipo}</span>
                <span className="ml-auto"><StatusBadge value={a.atendida ? "Atendida" : "Pendiente"} /></span>
            </div>

            <DetailGrid
                items={[
                    { icon: Building2, label: "Cliente", value: a.empresa },
                    { icon: Radio, label: "Repetidora", value: a.numeroSerie },
                    { icon: Waves, label: "Frecuencia", value: `${a.frecuencia}${a.banda ? ` (${a.banda})` : ""}` },
                    { icon: Activity, label: "Estado de la frecuencia", value: a.estadoSolicitud },
                    { icon: CalendarClock, label: "Fecha de vencimiento", value: fechaCorta(a.fechaVencimiento) },
                    { icon: Hourglass, label: "Días restantes", value: textoDias(a.diasRestantes) },
                    { icon: BellRing, label: "Alerta generada el", value: fechaCorta(a.fechaAlerta) },
                    { icon: UserRound, label: "Vendedor responsable", value: a.vendedor },
                    {
                        icon: Mail,
                        label: "Correo electrónico",
                        value: a.correoEnviado ? `Enviado el ${fechaHora(a.fechaEnvio)}` : "Aún no se ha podido enviar",
                        wide: true,
                    },
                ]}
            />

            {!a.correoEnviado && a.errorEnvio && (
                <Notice tone="warning">
                    El correo no se pudo enviar y se reintentará en la próxima verificación. Motivo: {a.errorEnvio}
                </Notice>
            )}

            {a.atendida ? (
                <div className="rounded-lg border p-4" style={{ borderColor: COLORS.border }}>
                    <p className="flex items-center gap-1.5 text-sm mb-2" style={{ fontWeight: 600, color: COLORS.greenDark }}>
                        <CheckCircle2 size={15} /> Atendida el {fechaHora(a.fechaAtencion)} por {a.usuarioAtencion}
                    </p>
                    <p className="text-sm whitespace-pre-line" style={{ color: COLORS.charcoal }}>{a.notaAtencion}</p>
                </div>
            ) : canAtender ? (
                <form id="form-atender-alerta" onSubmit={atender} noValidate>
                    {error && <Notice tone="error">{error}</Notice>}
                    <FieldLabel label="Acciones tomadas respecto a esta alerta *">
                        <textarea
                            value={nota}
                            onChange={(e) => setNota(e.target.value)}
                            rows={4}
                            maxLength={1000}
                            placeholder="Ej. Contacté al cliente, se acordó iniciar la renovación esta semana..."
                            className={inputClass}
                            style={inputStyle}
                        />
                    </FieldLabel>
                    <p className="text-xs mt-1" style={{ color: COLORS.muted }}>
                        Al marcarla como atendida se registra la fecha y la nota, y la alerta sale del listado de pendientes.
                    </p>
                </form>
            ) : (
                <p className="text-sm" style={{ color: COLORS.muted }}>Esta alerta todavía no ha sido atendida por el vendedor responsable.</p>
            )}
        </Modal>
    );
}
