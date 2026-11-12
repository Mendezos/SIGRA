import { useRef, useState } from "react";
import { PhoneCall } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import { MEDIOS_ATENCION_BATERIA } from "../../services/crmCatalogosService";
import * as api from "../../services/crmRecordatoriosService";
import { fechaLocal } from "./helpers";

// Mismos mensajes que devuelve el servidor, para avisar antes de enviar.
const MENSAJE_OBLIGATORIOS = "Debe completar los campos obligatorios para registrar la atención.";

// Atención de un recordatorio de batería (CRMGPSC-025): medio, resultado, observación y próximo paso.
export default function BateriaAtencionModal({ recordatorio: r, onClose, onSaved }) {
    const [form, setForm] = useState({ medio: "", resultado: "", observacion: "", proximoPaso: "" });
    const [error, setError] = useState("");
    const [errores, setErrores] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const enviando = useRef(false);

    const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

    async function guardar(e) {
        e.preventDefault();
        if (enviando.current) return;
        setError("");
        setErrores([]);

        const faltantes = [];
        if (!form.medio) faltantes.push("Medio de contacto");
        if (!form.resultado.trim()) faltantes.push("Resultado");
        if (faltantes.length > 0) {
            setError(MENSAJE_OBLIGATORIOS);
            setErrores(faltantes);
            return;
        }

        enviando.current = true;
        setGuardando(true);
        try {
            onSaved(
                await api.atenderBateria(r.idRecordatorio, {
                    medio: form.medio,
                    resultado: form.resultado.trim(),
                    observacion: form.observacion.trim() || null,
                    proximoPaso: form.proximoPaso.trim() || null,
                })
            );
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo registrar la atención.");
            setErrores(err.errores ?? []);
        } finally {
            enviando.current = false;
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={PhoneCall}
            title={`Registrar atención · ${r.codigo}`}
            subtitle={`${r.cliente} · ${r.cantidad} × ${r.modeloBateria} · recordatorio del ${fechaLocal(r.fechaRecordatorio)}`}
            width="max-w-2xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-bateria-atencion" disabled={guardando}>
                        {guardando ? "Guardando..." : "Registrar atención"}
                    </Button>
                </div>
            }
        >
            {error && (
                <Notice tone="error">
                    {error}
                    {errores.length > 0 && <ul className="list-disc ml-4 mt-1">{errores.map((x) => <li key={x}>{x}</li>)}</ul>}
                </Notice>
            )}

            <form id="form-bateria-atencion" onSubmit={guardar} noValidate className="grid grid-cols-1 gap-4">
                <FieldLabel label="Medio de contacto *">
                    <select value={form.medio} onChange={set("medio")} className={inputClass} style={inputStyle}>
                        <option value="">Seleccione el medio</option>
                        {MEDIOS_ATENCION_BATERIA.map((m) => <option key={m}>{m}</option>)}
                    </select>
                </FieldLabel>
                <FieldLabel label="Resultado *">
                    <textarea
                        rows={2}
                        value={form.resultado}
                        onChange={set("resultado")}
                        maxLength={api.LIMITES_BATERIA.resultado}
                        placeholder="Ej. El cliente confirmó que necesita el reemplazo"
                        className={inputClass}
                        style={inputStyle}
                    />
                </FieldLabel>
                <FieldLabel label="Observación">
                    <textarea rows={3} value={form.observacion} onChange={set("observacion")} maxLength={api.LIMITES_BATERIA.observacion} className={inputClass} style={inputStyle} />
                </FieldLabel>
                <FieldLabel label="Próximo paso">
                    <input value={form.proximoPaso} onChange={set("proximoPaso")} maxLength={api.LIMITES_BATERIA.proximoPaso} placeholder="Ej. Enviar cotización el viernes" className={inputClass} style={inputStyle} />
                </FieldLabel>

                <p className="text-xs" style={{ color: COLORS.muted }}>
                    Al guardar, el recordatorio queda &quot;Atendido&quot; y se conserva todo el seguimiento (medio, resultado, observación, próximo paso, quién y cuándo).
                </p>
            </form>
        </Modal>
    );
}
