import { useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/crmSeguimientosService";
import { ahoraInputFechaHora, fechaHoraLocal } from "./helpers";
import SeguimientoMensajeCampo from "./SeguimientoMensajeCampo";

// CRMGPSC-018: completar un seguimiento. Registra una interacción vinculada en el historial comercial de la empresa.
export default function SeguimientoCompletarModal({ seguimiento: s, onClose, onDone }) {
    const [ahora] = useState(() => ahoraInputFechaHora());
    const [fechaReal, setFechaReal] = useState(ahora);
    const [resultado, setResultado] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [proximoPaso, setProximoPaso] = useState("");
    const [campos, setCampos] = useState({});
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);
    const enviando = useRef(false);

    function validar() {
        if (!resultado.trim()) return { campos: { resultado: "Indique el resultado del seguimiento." }, mensaje: api.MENSAJE_SIN_RESULTADO };
        if (fechaReal && fechaReal > ahoraInputFechaHora()) return { campos: { fechaReal: " " }, mensaje: api.MENSAJE_FECHA_REAL_FUTURA };
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
            onDone(
                await api.completarSeguimiento(s.idSeguimiento, {
                    fechaReal: fechaReal || null,
                    resultado: resultado.trim(),
                    observaciones: observaciones.trim() || null,
                    proximoPaso: proximoPaso.trim() || null,
                })
            );
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo completar el seguimiento.");
        } finally {
            enviando.current = false;
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={CheckCircle2}
            title={`Completar ${s.codigo}`}
            subtitle={`${s.empresa} · ${s.tipo} programado para ${fechaHoraLocal(s.fechaHora)}`}
            width="max-w-2xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={guardando}>Volver</Button>
                    <Button variant="primary" type="submit" form="form-completar" disabled={guardando}>
                        {guardando ? "Guardando..." : "Completar"}
                    </Button>
                </div>
            }
        >
            <Notice tone="warning">
                Al completarlo se registra una interacción en el historial comercial de {s.empresa} y el seguimiento ya no se podrá reprogramar.
            </Notice>
            {error && <Notice tone="error">{error}</Notice>}

            <form id="form-completar" onSubmit={confirmar} noValidate className="grid grid-cols-1 gap-4">
                <div className="sm:max-w-xs">
                    <FieldLabel label="Fecha y hora real">
                        <input type="datetime-local" value={fechaReal} max={ahora} onChange={(e) => setFechaReal(e.target.value)} aria-invalid={campos.fechaReal ? true : undefined} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                    <SeguimientoMensajeCampo texto={campos.fechaReal?.trim()} />
                </div>

                <div>
                    <FieldLabel label="Resultado *">
                        <textarea
                            value={resultado}
                            onChange={(e) => setResultado(e.target.value)}
                            rows={3}
                            maxLength={api.MAX_RESULTADO}
                            placeholder="Ej. El cliente aceptó una reunión para revisar la cotización..."
                            aria-invalid={campos.resultado ? true : undefined}
                            className={inputClass}
                            style={inputStyle}
                        />
                    </FieldLabel>
                    <SeguimientoMensajeCampo texto={campos.resultado} />
                </div>

                <FieldLabel label="Observaciones">
                    <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} maxLength={api.MAX_OBSERVACIONES} className={inputClass} style={inputStyle} />
                </FieldLabel>

                <FieldLabel label="Próximo paso">
                    <input value={proximoPaso} onChange={(e) => setProximoPaso(e.target.value)} maxLength={api.MAX_PROXIMO_PASO} placeholder="Ej. Enviar la cotización actualizada" className={inputClass} style={inputStyle} />
                </FieldLabel>
            </form>
        </Modal>
    );
}
