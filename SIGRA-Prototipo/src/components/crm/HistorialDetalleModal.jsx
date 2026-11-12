import { History } from "lucide-react";
import Modal from "../Modal";
import { Button, DetailGrid } from "../ui";
import { VISIBILIDADES_NOTA } from "../../services/crmCatalogosService";
import * as api from "../../services/crmHistorialService";
import { fechaHoraLocal } from "./helpers";

// Detalle completo de un movimiento del historial (interacción, nota o cotización).
export default function HistorialDetalleModal({ movimiento, empresa, onClose }) {
    const esNota = movimiento.tipoMovimiento === api.MOVIMIENTO_NOTA;
    const esCotizacion = movimiento.tipoMovimiento === api.MOVIMIENTO_COTIZACION;

    const items = [
        { label: "Identificador", value: api.codigoMovimiento(movimiento) },
        { label: "Tipo", value: esNota || esCotizacion ? movimiento.tipoMovimiento : `${movimiento.tipoMovimiento} · ${movimiento.tipo}` },
        { label: "Fecha y hora", value: fechaHoraLocal(movimiento.fecha) },
        { label: "Empresa", value: empresa },
        { label: esCotizacion ? "Registrada por" : "Autor", value: movimiento.autor },
    ];

    if (!esNota && !esCotizacion) items.push({ label: "Contacto", value: movimiento.contacto });
    if (esNota) {
        items.push({ label: "Categoría", value: movimiento.categoria });
        items.push({ label: "Visibilidad", value: VISIBILIDADES_NOTA.find((v) => v.value === movimiento.visibilidad)?.label ?? movimiento.visibilidad });
    }
    if (esCotizacion) {
        items.push({ label: "Estado de la cotización", value: movimiento.estadoCotizacion });
        items.push({ label: "Monto", value: api.montoCotizacion(movimiento.monto, movimiento.moneda) });
    } else {
        items.push({ label: esNota ? "Texto de la nota" : "Descripción", value: movimiento.descripcion, wide: true });
    }
    if (!esNota && !esCotizacion) {
        items.push({ label: "Resultado", value: movimiento.resultado });
        items.push({ label: "Próximo paso", value: movimiento.proximoPaso });
        items.push({ label: "Cotización relacionada", value: movimiento.idCotizacion ? api.codigoCotizacion(movimiento.idCotizacion) : "" });
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={History}
            title={`${movimiento.tipoMovimiento} ${api.codigoMovimiento(movimiento)}`}
            subtitle={empresa}
            width="max-w-2xl"
            footer={
                <div className="flex justify-end">
                    <Button variant="primary" onClick={onClose}>Cerrar</Button>
                </div>
            }
        >
            <DetailGrid items={items} />
        </Modal>
    );
}
