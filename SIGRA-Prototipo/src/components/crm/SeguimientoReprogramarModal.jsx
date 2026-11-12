import { useRef, useState } from "react";
import { CalendarClock } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/crmSeguimientosService";
import { fechaHoraLocal, hoyISO } from "./helpers";
import SeguimientoMensajeCampo from "./SeguimientoMensajeCampo";

// CRMGPSC-017: reprogramar un seguimiento Pendiente o Atrasado. La fecha original se conserva en el historial.
export default function SeguimientoReprogramarModal({ seguimiento: s, onClose, onDone }) {
    const [fecha, setFecha] = useState("");
    const [hora, setHora] = useState("");
    const [motivo, setMotivo] = useState("");
    const [campos, setCampos] = useState({});
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);
    const enviando = useRef(false);

    function validar() {
        const c = {};
        if (!fecha) c.fecha = "Indique la nueva fecha.";
        if (!hora) c.hora = "Indique la nueva hora.";
        if (!motivo.trim()) c.motivo = "Indique el motivo de la reprogramación.";
        if (Object.keys(c).length > 0) return { campos: c, mensaje: api.MENSAJE_FALTANTES_REPROGRAMAR };

        if (!api.fechaExiste(fecha) || !api.horaExiste(hora)) return { campos: { fecha: " ", hora: " " }, mensaje: api.MENSAJE_FECHA_HORA_INVALIDA };
        if (new Date(`${fecha}T${hora}:00`).getTime() <= Date.now())
            return { campos: { fecha: " ", hora: " " }, mensaje: `La nueva fecha y hora ya pasaron; el seguimiento conserva su programación anterior (${fechaHoraLocal(s.fechaHora)}). Inserte una fecha y hora futuras.` };
        return null;
    }

    async function confirmar(e) {
        e.preventDefault();
        if (enviando.current) return;
        setError("");

        const problema = validar();
        setCampos(problema?.campos ?? {});
        if (problema) return setError(problema.mensaje);

        enviando.current = true;
        setGuardando(true);
        try {
            onDone(await api.reprogramarSeguimiento(s.idSeguimiento, { fecha, hora, motivo: motivo.trim() }));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo reprogramar el seguimiento.");
        } finally {
            enviando.current = false;
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={CalendarClock}
            title={`Reprogramar ${s.codigo}`}
            subtitle={`${s.empresa} · programado para ${fechaHoraLocal(s.fechaHora)}`}
            width="max-w-lg"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={guardando}>Volver</Button>
                    <Button variant="primary" type="submit" form="form-reprogramar" disabled={guardando}>
                        {guardando ? "Guardando..." : "Confirmar reprogramación"}
                    </Button>
                </div>
            }
        >
            {s.estado === "Atrasado" && (
                <Notice tone="warning">Este seguimiento está atrasado. Al reprogramarlo vuelve a quedar Pendiente.</Notice>
            )}
            {error && <Notice tone="error">{error}</Notice>}

            <form id="form-reprogramar" onSubmit={confirmar} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <FieldLabel label="Nueva fecha *">
                        <input type="date" value={fecha} min={hoyISO()} onChange={(e) => setFecha(e.target.value)} aria-invalid={campos.fecha ? true : undefined} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                    <SeguimientoMensajeCampo texto={campos.fecha?.trim()} />
                </div>
                <div>
                    <FieldLabel label="Nueva hora *">
                        <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} aria-invalid={campos.hora ? true : undefined} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                    <SeguimientoMensajeCampo texto={campos.hora?.trim()} />
                </div>
                <div className="sm:col-span-2">
                    <FieldLabel label="Motivo de la reprogramación *">
                        <textarea
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            rows={3}
                            maxLength={api.MAX_MOTIVO}
                            placeholder="Ej. El cliente pidió que lo llamemos la próxima semana..."
                            aria-invalid={campos.motivo ? true : undefined}
                            className={inputClass}
                            style={inputStyle}
                        />
                    </FieldLabel>
                    <SeguimientoMensajeCampo texto={campos.motivo} />
                </div>
            </form>

            <p className="text-xs mt-4" style={{ color: COLORS.muted }}>
                La programación original ({fechaHoraLocal(s.fechaHoraOriginal)}) y la fecha actual quedan registradas en el historial con su autor.
            </p>
        </Modal>
    );
}
