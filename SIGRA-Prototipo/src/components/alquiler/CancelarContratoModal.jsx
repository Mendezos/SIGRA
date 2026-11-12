import { useState } from "react";
import { Ban } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import { fechaCorta, hoyISO } from "./helpers";

const aFecha = (valor) => String(valor).slice(0, 10);

export default function CancelarContratoModal({ detalle, onClose, onSaved }) {
    const { contrato, equipos } = detalle;
    const inicio = aFecha(contrato.fechaInicio);
    const vencimiento = aFecha(contrato.fechaVencimiento);
    const hoy = hoyISO();
    const [form, setForm] = useState({
        fecha: hoy < inicio ? inicio : hoy > vencimiento ? vencimiento : hoy,
        motivo: "",
        monto: "",
        moneda: contrato.moneda,
        justificacion: "",
        observaciones: "",
    });
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);
    const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
    const hayPenalizacion = !!contrato.penalizacion;

    async function guardar(e) {
        e.preventDefault();
        setError("");
        setGuardando(true);
        try {
            onSaved(await api.cancelarContrato(contrato.idContrato, {
                motivo: form.motivo,
                fechaCancelacion: form.fecha || null,
                penalizacionMonto: form.monto === "" ? null : Number(form.monto),
                penalizacionMoneda: form.moneda,
                penalizacionJustificacion: form.justificacion || null,
                observaciones: form.observaciones || null,
            }));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo cancelar el contrato.");
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={Ban}
            tone="danger"
            title={`Cancelar contrato ${api.codigoContrato(contrato.idContrato)}`}
            subtitle={contrato.empresa}
            width="max-w-xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Volver</Button>
                    <Button variant="danger" type="submit" form="form-cancelar" disabled={guardando}>{guardando ? "Cancelando..." : "Cancelar contrato"}</Button>
                </div>
            }
        >
            {error && <Notice tone="error">{error}</Notice>}
            <p className="text-sm mb-4" style={{ color: "#323232" }}>
                Al cancelar, los {equipos.length} equipo(s) quedan <strong>Disponibles</strong> en el inventario y se avisa al equipo técnico para que verifique su devolución. Esta acción no se puede deshacer.
            </p>
            {hayPenalizacion && <Notice tone="warning">Condición de penalización del contrato: {contrato.penalizacion}</Notice>}

            <form id="form-cancelar" onSubmit={guardar} className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
                <FieldLabel label={`Fecha de cancelación * (entre ${fechaCorta(contrato.fechaInicio)} y ${fechaCorta(contrato.fechaVencimiento)})`}>
                    <input type="date" value={form.fecha} min={inicio} max={vencimiento} onChange={cambiar("fecha")} className={inputClass} style={inputStyle} />
                </FieldLabel>
                <div className="sm:col-span-2">
                    <FieldLabel label="Motivo de la cancelación *">
                        <textarea value={form.motivo} onChange={cambiar("motivo")} rows={2} maxLength={300} className={inputClass} style={inputStyle} autoFocus />
                    </FieldLabel>
                </div>
                <FieldLabel label={`Monto de la penalización${hayPenalizacion ? " *" : ""}`}>
                    <input type="number" min="0" step="0.01" value={form.monto} onChange={cambiar("monto")} className={inputClass} style={inputStyle} />
                </FieldLabel>
                <FieldLabel label="Moneda">
                    <select value={form.moneda} onChange={cambiar("moneda")} className={inputClass} style={inputStyle}>
                        <option value="CRC">Colones (CRC)</option>
                        <option value="USD">Dólares (USD)</option>
                    </select>
                </FieldLabel>
                <div className="sm:col-span-2">
                    <FieldLabel label={hayPenalizacion ? "Si no se cobra penalización, justifique por qué *" : "Justificación si no se cobra penalización"}>
                        <input value={form.justificacion} onChange={cambiar("justificacion")} maxLength={300} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                </div>
                <div className="sm:col-span-2">
                    <FieldLabel label="Observaciones">
                        <textarea value={form.observaciones} onChange={cambiar("observaciones")} rows={2} maxLength={500} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                </div>
            </form>
        </Modal>
    );
}
