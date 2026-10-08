import { useState } from "react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";

export default function CancelarContratoModal({ detalle, onClose, onSaved }) {
    const { contrato, equipos } = detalle;
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    async function guardar(e) {
        e.preventDefault();
        setError("");
        setGuardando(true);
        try {
            onSaved(await api.cancelarContrato(contrato.idContrato, motivo));
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
            title={`Cancelar contrato ${api.codigoContrato(contrato.idContrato)}`}
            subtitle={contrato.empresa}
            width="max-w-lg"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Volver</Button>
                    <Button variant="danger" type="submit" form="form-cancelar" disabled={guardando}>
                        {guardando ? "Cancelando..." : "Cancelar contrato"}
                    </Button>
                </div>
            }
        >
            {error && <Notice tone="error">{error}</Notice>}
            <p className="text-sm mb-4" style={{ color: "#323232" }}>
                Al cancelar, los {equipos.length} equipo(s) del contrato quedan <strong>Disponibles</strong> en el inventario. Esta acción no se puede deshacer.
            </p>
            <form id="form-cancelar" onSubmit={guardar}>
                <FieldLabel label="Motivo de la cancelación *">
                    <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} maxLength={300} className={inputClass} style={inputStyle} autoFocus />
                </FieldLabel>
            </form>
        </Modal>
    );
}
