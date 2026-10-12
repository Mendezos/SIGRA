import { useEffect, useState } from "react";
import Modal from "../Modal";
import { Button, Notice } from "../ui";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import { listarArticulos } from "../../services/inventarioService";
import AccesoriosPicker from "./AccesoriosPicker";
import { aItemsApi } from "./helpers";

export default function AccesoriosContratoModal({ detalle, onClose, onSaved }) {
    const { contrato, accesorios } = detalle;
    const [catalogo, setCatalogo] = useState([]);
    const [items, setItems] = useState(
        accesorios.map((a) => ({ idAccesorioModelo: String(a.idAccesorioModelo), cantidad: String(a.cantidad) }))
    );
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        let activo = true;
        listarArticulos("accesorios")
            .then((lista) => activo && setCatalogo(lista))
            .catch((e) => activo && setError(e.message ?? "No se pudo cargar el catálogo de accesorios."));
        return () => {
            activo = false;
        };
    }, []);

    async function guardar() {
        setError("");
        setGuardando(true);
        try {
            onSaved(await api.guardarAccesoriosContrato(contrato.idContrato, aItemsApi(items)));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudieron guardar los accesorios.");
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title="Accesorios entregados"
            subtitle={`Contrato ${api.codigoContrato(contrato.idContrato)} · ${contrato.empresa}`}
            width="max-w-2xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" disabled={guardando} onClick={guardar}>
                        {guardando ? "Guardando..." : "Guardar accesorios"}
                    </Button>
                </div>
            }
        >
            {error && <Notice tone="error">{error}</Notice>}
            <AccesoriosPicker catalogo={catalogo} value={items} onChange={setItems} />
        </Modal>
    );
}
