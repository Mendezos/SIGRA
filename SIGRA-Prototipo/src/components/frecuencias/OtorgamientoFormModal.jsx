import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/frecuenciasService";
import { fechaCorta, hoyISO } from "./helpers";

const soloLectura = { ...inputStyle, backgroundColor: COLORS.greenTint };

// Mismos mensajes que devuelve el servidor, para avisar antes de enviar.
const MENSAJE_SIN_RESOLUCION = "Debe ingresar el número de resolución o expediente gubernamental";
const MENSAJE_FECHA_ANTERIOR = "La fecha de otorgamiento no puede ser anterior a la fecha de solicitud";

export default function OtorgamientoFormModal({ solicitud: s, onClose, onSaved }) {
    const [fecha, setFecha] = useState(hoyISO());
    const [resolucion, setResolucion] = useState("");
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    const presentacion = s.fechaPresentacion?.slice(0, 10) ?? s.fechaRegistro?.slice(0, 10);
    const vencimiento = api.vencimientoDe(fecha);

    async function guardar(e) {
        e.preventDefault();
        setError("");

        if (!resolucion.trim()) return setError(MENSAJE_SIN_RESOLUCION);
        if (!fecha) return setError("Debe indicar la fecha de otorgamiento");
        if (presentacion && fecha < presentacion) return setError(MENSAJE_FECHA_ANTERIOR);

        setGuardando(true);
        try {
            onSaved(await api.registrarOtorgamiento(s.idSolicitud, { fechaOtorgamiento: fecha, numeroResolucion: resolucion }));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo registrar el otorgamiento.");
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={BadgeCheck}
            title={`Registrar otorgamiento · ${api.codigoSolicitud(s.idSolicitud)}`}
            subtitle={`${s.empresa} · ${s.frecuencia} · repetidora ${s.numeroSerie}`}
            width="max-w-xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-otorgamiento" disabled={guardando}>
                        {guardando ? "Guardando..." : "Registrar otorgamiento"}
                    </Button>
                </div>
            }
        >
            {error && <Notice tone="error">{error}</Notice>}

            <form id="form-otorgamiento" onSubmit={guardar} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldLabel label="Trámite presentado el">
                    <input value={fechaCorta(s.fechaPresentacion) || "—"} readOnly className={inputClass} style={soloLectura} />
                </FieldLabel>
                <FieldLabel label="Estado actual">
                    <input value={s.estado} readOnly className={inputClass} style={soloLectura} />
                </FieldLabel>

                <FieldLabel label="Fecha de otorgamiento *">
                    <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} max={hoyISO()} className={inputClass} style={inputStyle} />
                </FieldLabel>
                <FieldLabel label="Fecha de vencimiento (otorgamiento + 5 años)">
                    <input
                        value={vencimiento ? fechaCorta(`${vencimiento}T00:00:00`) : "Se calcula al indicar la fecha"}
                        readOnly
                        className={inputClass}
                        style={soloLectura}
                    />
                </FieldLabel>

                <div className="md:col-span-2">
                    <FieldLabel label="Número de resolución o expediente gubernamental *">
                        <input
                            value={resolucion}
                            onChange={(e) => setResolucion(e.target.value)}
                            maxLength={100}
                            placeholder="Ej. RES-2026-00123"
                            className={inputClass}
                            style={inputStyle}
                        />
                    </FieldLabel>
                </div>

                <p className="md:col-span-2 text-xs" style={{ color: COLORS.muted }}>
                    Al guardar, la solicitud pasa a &quot;Otorgada&quot; y queda &quot;Vigente&quot; hasta la fecha de vencimiento, desde donde se generan las alertas al vendedor responsable.
                </p>
            </form>
        </Modal>
    );
}
