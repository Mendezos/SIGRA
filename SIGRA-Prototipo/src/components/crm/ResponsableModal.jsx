import { useEffect, useState } from "react";
import { UserCog } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as catalogos from "../../services/crmCatalogosService";
import * as api from "../../services/crmClientesService";

// CRMGPSC-020: la coordinación asigna o reasigna al vendedor responsable de un prospecto o de un cliente.
// tipo: "prospectos" | "clientes"; registro: { id, empresa, idVendedor, vendedor }.
export default function ResponsableModal({ tipo, registro, onClose, onHecho }) {
    const [vendedores, setVendedores] = useState([]);
    const [idVendedor, setIdVendedor] = useState("");
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);
    const reasigna = !!registro.idVendedor;

    useEffect(() => {
        let activo = true;
        catalogos.listarVendedores().then((l) => activo && setVendedores(l)).catch(() => activo && setError("No se pudo cargar la lista de vendedores."));
        return () => { activo = false; };
    }, []);

    async function guardar(e) {
        e.preventDefault();
        setError("");
        if (!idVendedor) { setError("Seleccione el vendedor responsable."); return; }
        if (reasigna && Number(idVendedor) !== registro.idVendedor && !motivo.trim()) { setError("Indique el motivo de la reasignación."); return; }
        setGuardando(true);
        try {
            onHecho(await api.asignarResponsable(tipo, registro.id, { idVendedor: Number(idVendedor), motivo }));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo guardar el responsable.");
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={UserCog}
            title={reasigna ? "Reasignar responsable" : "Asignar responsable"}
            subtitle={registro.empresa}
            width="max-w-lg"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-responsable" disabled={guardando}>{guardando ? "Guardando..." : "Confirmar"}</Button>
                </div>
            }
        >
            {error && <Notice tone="error">{error}</Notice>}
            <p className="text-sm mb-4">
                Responsable actual: <strong>{registro.vendedor ?? "Sin asignar"}</strong>.
                {reasigna && " Al reasignar, los seguimientos pendientes pasan al vendedor nuevo y el anterior queda en el historial."}
            </p>
            <form id="form-responsable" onSubmit={guardar} className="space-y-4" noValidate>
                <FieldLabel label="Vendedor responsable *">
                    <select value={idVendedor} onChange={(e) => setIdVendedor(e.target.value)} className={inputClass} style={inputStyle} autoFocus>
                        <option value="">Seleccione un vendedor activo...</option>
                        {vendedores.map((v) => <option key={v.idUsuario} value={v.idUsuario}>{v.nombre}{v.idUsuario === registro.idVendedor ? " (actual)" : ""}</option>)}
                    </select>
                </FieldLabel>
                {reasigna && (
                    <FieldLabel label="Motivo de la reasignación *">
                        <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} maxLength={300} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                )}
            </form>
        </Modal>
    );
}
