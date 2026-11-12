import { BatteryCharging, PhoneCall } from "lucide-react";
import Modal from "../Modal";
import { Button, DetailGrid } from "../ui";
import { formatearFechaHora } from "../../utils/format";
import { codigoBateria, estaAbierto } from "../../services/crmRecordatoriosService";
import { BateriaEstado, BateriaVencimiento } from "./BateriaEstado";
import { fechaLocal } from "./helpers";

// Detalle de un recordatorio de batería: datos de la compra, el aviso y, si ya se gestionó, todo el seguimiento de la atención.
export default function BateriaDetalleModal({ recordatorio: r, puedeAtender, onAtender, onClose }) {
    const abierto = estaAbierto(r.estado);
    const reemplaza = (r.reemplaza ?? []).map(codigoBateria).join(", ");

    const compra = [
        { label: "Cliente", value: r.cliente },
        { label: "Contacto", value: r.contacto ? [r.contacto, r.contactoTelefono, r.contactoCorreo].filter(Boolean).join(" · ") : "" },
        { label: "Batería", value: r.modeloBateria },
        { label: "Cantidad", value: String(r.cantidad) },
        { label: "Fecha de compra", value: fechaLocal(r.fechaCompra) },
        { label: "Factura", value: r.numeroFactura },
        { label: "Vendedor responsable", value: r.vendedor + (r.vendedorActivo ? "" : " (inactivo)") },
        { label: "Fecha del recordatorio", value: fechaLocal(r.fechaRecordatorio) },
    ];

    const estado = [
        { label: "Aviso al vendedor", value: r.fechaNotificacion ? formatearFechaHora(r.fechaNotificacion) : abierto ? "Aún no se ha avisado" : "" },
    ];
    if (reemplaza) estado.push({ label: "Reemplazó a", value: reemplaza });
    if (r.estado === "Cerrado") {
        estado.push({ label: "Cerrado el", value: formatearFechaHora(r.fechaCierre) });
        estado.push({ label: "Motivo del cierre", value: r.motivoCierre, wide: true });
        if (r.idRecordatorioNuevo) estado.push({ label: "Reemplazado por", value: codigoBateria(r.idRecordatorioNuevo) });
    }

    const atencion = [
        { label: "Atendido el", value: formatearFechaHora(r.fechaAtencion) },
        { label: "Atendido por", value: r.usuarioAtencion },
        { label: "Medio de contacto", value: r.medioAtencion },
        { label: "Resultado", value: r.resultadoAtencion, wide: true },
        { label: "Observación", value: r.observacionAtencion, wide: true },
        { label: "Próximo paso", value: r.proximoPasoAtencion, wide: true },
    ];

    return (
        <Modal
            open
            onClose={onClose}
            icon={BatteryCharging}
            title={`Recordatorio ${r.codigo}`}
            subtitle={`${r.cliente} · ${r.cantidad} × ${r.modeloBateria}`}
            width="max-w-3xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cerrar</Button>
                    {abierto && puedeAtender && (
                        <Button variant="primary" className="flex items-center gap-1.5" onClick={onAtender}>
                            <PhoneCall size={15} /> Registrar atención
                        </Button>
                    )}
                </div>
            }
        >
            <div className="flex flex-wrap items-center gap-3 mb-5">
                <BateriaEstado estado={r.estado} />
                <BateriaVencimiento recordatorio={r} />
            </div>
            <DetailGrid title="Compra" items={compra} />
            <DetailGrid title="Estado del recordatorio" items={estado} />
            {r.estado === "Atendido" && <DetailGrid title="Atención al cliente" items={atencion} />}
        </Modal>
    );
}
