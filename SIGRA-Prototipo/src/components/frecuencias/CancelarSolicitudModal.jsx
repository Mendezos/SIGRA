import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/frecuenciasService";

// Mismo mensaje que devuelve el servidor, para avisar antes de enviar.
const MENSAJE_SIN_MOTIVO = "Debe indicar el motivo de la cancelación";

export default function CancelarSolicitudModal({ solicitud: s, onClose, onCancelada }) {
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    async function confirmar(e) {
        e.preventDefault();
        setError("");
        if (!motivo.trim()) return setError(MENSAJE_SIN_MOTIVO);

        setGuardando(true);
        try {
            onCancelada(await api.cancelarSolicitud(s.idSolicitud, motivo));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo cancelar la solicitud.");
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={AlertTriangle}
            tone="danger"
            title={`Cancelar solicitud ${api.codigoSolicitud(s.idSolicitud)}`}
            subtitle={`${s.empresa} · ${s.frecuencia} · repetidora ${s.numeroSerie}`}
            width="max-w-lg"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={guardando}>Volver</Button>
                    <Button variant="dangerSolid" type="submit" form="form-cancelar-solicitud" disabled={guardando}>
                        {guardando ? "Cancelando..." : "Confirmar cancelación"}
                    </Button>
                </div>
            }
        >
            <Notice tone="warning">
                La solicitud pasará a &quot;Cancelada&quot; y se detendrán sus alertas de vencimiento. Esta acción no se puede deshacer.
            </Notice>

            {error && <Notice tone="error">{error}</Notice>}

            <form id="form-cancelar-solicitud" onSubmit={confirmar} noValidate>
                <FieldLabel label="Motivo de la cancelación *">
                    <textarea
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        rows={4}
                        maxLength={500}
                        placeholder="Ej. El trámite no procedió / el cliente ya no requiere la frecuencia..."
                        className={inputClass}
                        style={inputStyle}
                    />
                </FieldLabel>
            </form>
        </Modal>
    );
}
