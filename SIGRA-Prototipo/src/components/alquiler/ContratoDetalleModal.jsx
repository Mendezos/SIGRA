import { useState } from "react";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { Button, DetailGrid, Notice } from "../ui";
import { COLORS } from "../uiTheme";
import { codigoContrato } from "../../services/alquilerService";
import AsignarRadioModal from "./AsignarRadioModal";
import { colones, fechaCorta } from "./helpers";

export default function ContratoDetalleModal({ detalle, mensaje, canAsignarRadio, onClose, onChanged }) {
    const [asignando, setAsignando] = useState(false);
    const [aviso, setAviso] = useState("");

    if (!detalle) return null;
    const { contrato, equipos } = detalle;
    const radioElegible = contrato.estadoRegistrado === "Activo";

    return (
        <Modal
            open
            onClose={onClose}
            title={`Contrato ${codigoContrato(contrato.idContrato)}`}
            subtitle={contrato.empresa}
            width="max-w-3xl"
        >
            {(mensaje || aviso) && <Notice>{aviso || mensaje}</Notice>}

            <div className="flex items-center gap-3 mb-4">
                <span className="text-xs uppercase tracking-wide" style={{ color: COLORS.muted, fontWeight: 600 }}>Estado</span>
                <StatusBadge value={contrato.estado} />
            </div>

            <DetailGrid
                items={[
                    { label: "Empresa cliente", value: contrato.empresa },
                    { label: "Vendedor", value: contrato.vendedor },
                    { label: "Fecha de inicio", value: fechaCorta(contrato.fechaInicio) },
                    { label: "Fecha de vencimiento", value: fechaCorta(contrato.fechaVencimiento) },
                    { label: "Monto mensual", value: colones(contrato.montoMensual) },
                    { label: "Equipos asociados", value: String(equipos.length) },
                    { label: "Condiciones", value: contrato.condiciones, wide: true },
                ]}
            />

            <section>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs uppercase tracking-wide" style={{ color: COLORS.muted, fontWeight: 600 }}>
                        Equipos del contrato
                    </h3>
                    {canAsignarRadio && radioElegible && (
                        <Button onClick={() => setAsignando(true)}>Asignar radio</Button>
                    )}
                </div>

                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
                    <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ backgroundColor: COLORS.greenTint }}>
                                {["Número de serie", "Equipo", "Categoría", "Asignado", "Estado"].map((h) => (
                                    <th key={h} className="text-left px-4 py-2.5 text-xs uppercase tracking-wide" style={{ color: COLORS.muted, fontWeight: 600 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {equipos.length === 0 && (
                                <tr><td colSpan={5} className="px-4 py-5 text-center text-sm" style={{ color: COLORS.muted }}>Este contrato todavía no tiene equipos.</td></tr>
                            )}
                            {equipos.map((e) => (
                                <tr key={e.idEquipo} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                                    <td className="px-4 py-2.5" style={{ fontWeight: 600, color: COLORS.charcoal }}>{e.numeroSerie}</td>
                                    <td className="px-4 py-2.5">{e.marca} {e.modelo}</td>
                                    <td className="px-4 py-2.5">{e.categoria}</td>
                                    <td className="px-4 py-2.5">{fechaCorta(e.fechaAsignacion)}</td>
                                    <td className="px-4 py-2.5"><StatusBadge value={e.estado} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {asignando && (
                <AsignarRadioModal
                    idContratoInicial={contrato.idContrato}
                    onClose={() => setAsignando(false)}
                    onSaved={(nuevo, serie) => {
                        setAsignando(false);
                        setAviso(`El radio ${serie} se asignó correctamente al contrato.`);
                        onChanged(nuevo);
                    }}
                />
            )}
        </Modal>
    );
}
