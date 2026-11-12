import { useState } from "react";
import { FileCheck } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import { fechaCorta, hoyISO } from "./helpers";

const LIMITE_MB = 10;

export default function ActivarContratoModal({ detalle, onClose, onSaved }) {
    const { contrato, equipos, accesorios } = detalle;
    // Si la fecha de inicio ya pasó hay que confirmar desde cuándo rige el contrato.
    const inicioPasado = String(contrato.fechaInicio).slice(0, 10) < hoyISO();
    const [archivo, setArchivo] = useState(null);
    const [fechaFirma, setFechaFirma] = useState(hoyISO());
    const [fechaInicioReal, setFechaInicioReal] = useState(inicioPasado ? hoyISO() : "");
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    function elegirArchivo(e) {
        const elegido = e.target.files?.[0] ?? null;
        setError("");
        if (elegido && !elegido.name.toLowerCase().endsWith(".pdf")) {
            setError(`El archivo no es válido: solo se aceptan documentos PDF de hasta ${LIMITE_MB} MB.`);
            e.target.value = "";
            setArchivo(null);
            return;
        }
        if (elegido && elegido.size > LIMITE_MB * 1024 * 1024) {
            setError(`El archivo es demasiado grande: el tamaño máximo es de ${LIMITE_MB} MB.`);
            e.target.value = "";
            setArchivo(null);
            return;
        }
        setArchivo(elegido);
    }

    async function guardar(e) {
        e.preventDefault();
        setError("");
        setGuardando(true);
        try {
            onSaved(await api.activarContrato(contrato.idContrato, { archivo, fechaFirma, fechaInicioReal: inicioPasado ? fechaInicioReal : "" }));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo activar el contrato.");
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={FileCheck}
            title={`Activar contrato ${api.codigoContrato(contrato.idContrato)}`}
            subtitle={contrato.idContratoOrigen ? `Renueva el contrato ${api.codigoContrato(contrato.idContratoOrigen)}` : contrato.empresa}
            width="max-w-xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Volver</Button>
                    <Button variant="primary" type="submit" form="form-activar" disabled={guardando}>{guardando ? "Activando..." : "Activar contrato"}</Button>
                </div>
            }
        >
            {error && <Notice tone="error">{error}</Notice>}

            <div className="rounded-lg px-4 py-3 text-sm mb-4" style={{ backgroundColor: COLORS.greenTint, color: COLORS.charcoal }}>
                <p>Al activar el contrato:</p>
                <ul className="list-disc ml-5 mt-1 space-y-0.5">
                    <li>{equipos.length} equipo(s) pasan a <strong>Alquilado</strong> en el inventario.</li>
                    {accesorios.length > 0 && <li>Los accesorios entregados salen de la bodega.</li>}
                    {contrato.idContratoOrigen && <li>El contrato anterior pasa a <strong>Renovado</strong> y sus equipos se traspasan a este.</li>}
                    <li>Se guarda el documento firmado y el contrato queda <strong>Activo</strong>.</li>
                </ul>
            </div>

            <form id="form-activar" onSubmit={guardar} className="space-y-4" noValidate>
                <FieldLabel label={`Documento firmado (PDF, máximo ${LIMITE_MB} MB) *`}>
                    <input type="file" accept="application/pdf,.pdf" onChange={elegirArchivo} className={inputClass} style={inputStyle} />
                </FieldLabel>
                <FieldLabel label="Fecha de firma *">
                    <input type="date" value={fechaFirma} max={hoyISO()} onChange={(e) => setFechaFirma(e.target.value)} className={inputClass} style={inputStyle} />
                </FieldLabel>
                {inicioPasado && (
                    <>
                        <Notice tone="warning">
                            La fecha de inicio del borrador ({fechaCorta(contrato.fechaInicio)}) ya pasó. Confirme la fecha real desde la que rige el contrato.
                        </Notice>
                        <FieldLabel label="Fecha real de inicio *">
                            <input type="date" value={fechaInicioReal} onChange={(e) => setFechaInicioReal(e.target.value)} className={inputClass} style={inputStyle} />
                        </FieldLabel>
                    </>
                )}
            </form>
        </Modal>
    );
}
