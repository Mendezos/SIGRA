import { useRef, useState } from "react";
import { Ban } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/crmSeguimientosService";
import { fechaHoraLocal } from "./helpers";

// CRMGPSC-018: cancelar un seguimiento. Conserva la planificación original.
export default function SeguimientoCancelarModal({ seguimiento: s, onClose, onDone }) {
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);
    const enviando = useRef(false);

    async function confirmar(e) {
        e.preventDefault();
        if (enviando.current) return;
        setError("");
        if (!motivo.trim()) return setError(api.MENSAJE_SIN_MOTIVO_CANCELACION);

        enviando.current = true;
        setGuardando(true);
        try {
            onDone(await api.cancelarSeguimiento(s.idSeguimiento, { motivo: motivo.trim() }));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo cancelar el seguimiento.");
        } finally {
            enviando.current = false;
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={Ban}
            tone="danger"
            title={`Cancelar ${s.codigo}`}
            subtitle={`${s.empresa} · ${s.tipo} programado para ${fechaHoraLocal(s.fechaHora)}`}
            width="max-w-lg"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={guardando}>Volver</Button>
                    <Button variant="dangerSolid" type="submit" form="form-cancelar-seguimiento" disabled={guardando}>
                        {guardando ? "Cancelando..." : "Cancelar seguimiento"}
                    </Button>
                </div>
            }
        >
            <Notice tone="warning">
                El seguimiento pasará a &quot;Cancelado&quot; y conservará su planificación original. Esta acción no se puede deshacer.
            </Notice>
            {error && <Notice tone="error">{error}</Notice>}

            <form id="form-cancelar-seguimiento" onSubmit={confirmar} noValidate>
                <FieldLabel label="Motivo de la cancelación *">
                    <textarea
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        rows={4}
                        maxLength={api.MAX_MOTIVO}
                        placeholder="Ej. El cliente ya no requiere la visita..."
                        aria-invalid={error && !motivo.trim() ? true : undefined}
                        className={inputClass}
                        style={inputStyle}
                    />
                </FieldLabel>
            </form>
        </Modal>
    );
}
