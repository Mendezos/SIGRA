import { useRef, useState } from "react";
import { Ban } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/crmSeguimientosService";

// CRMGPSC-024: cancelar una serie de contactos periódicos. Solo se cancelan los seguimientos futuros pendientes.
export default function SerieCancelarModal({ serie: s, onClose, onDone }) {
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);
    const enviando = useRef(false);

    async function confirmar(e) {
        e.preventDefault();
        if (enviando.current) return;
        setError("");
        if (!motivo.trim()) return setError(api.MENSAJE_SIN_MOTIVO_CANCELACION_SERIE);

        enviando.current = true;
        setGuardando(true);
        try {
            onDone(await api.cancelarSerie(s.idSerie, { motivo: motivo.trim() }));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo cancelar la serie.");
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
            title={`Cancelar serie ${s.codigo}`}
            subtitle={`${s.empresa} · contacto ${s.periodicidad.toLowerCase()}`}
            width="max-w-lg"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={guardando}>Volver</Button>
                    <Button variant="dangerSolid" type="submit" form="form-cancelar-serie" disabled={guardando}>
                        {guardando ? "Cancelando..." : "Cancelar serie"}
                    </Button>
                </div>
            }
        >
            <Notice tone="warning">
                Se cancelarán solamente los {s.pendientes - s.atrasados} seguimiento(s) futuros que siguen pendientes. Los completados y los que ya
                vencieron sin cerrarse se conservan (los atrasados los cierra el vendedor manualmente). Esta acción no se puede deshacer.
            </Notice>
            {error && <Notice tone="error">{error}</Notice>}

            <form id="form-cancelar-serie" onSubmit={confirmar} noValidate>
                <FieldLabel label="Motivo de la cancelación *">
                    <textarea
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        rows={4}
                        maxLength={api.MAX_MOTIVO}
                        placeholder="Ej. El cliente ya no requiere el contacto periódico..."
                        aria-invalid={error && !motivo.trim() ? true : undefined}
                        className={inputClass}
                        style={inputStyle}
                    />
                </FieldLabel>
            </form>
        </Modal>
    );
}
