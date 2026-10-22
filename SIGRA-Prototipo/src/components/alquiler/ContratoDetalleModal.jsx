import { useEffect, useState } from "react";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { Building2, CalendarClock, CalendarPlus, CalendarX, FileText, Radio, ShieldCheck, UserRound, Wallet } from "lucide-react";
import { Button, DetailGrid, Notice } from "../ui";
import { COLORS } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import AsignarRadioModal from "./AsignarRadioModal";
import AccesoriosContratoModal from "./AccesoriosContratoModal";
import CancelarContratoModal from "./CancelarContratoModal";
import RenovarContratoModal from "./RenovarContratoModal";
import { colones, fechaCorta, fechaHora } from "./helpers";

const ETIQUETAS_ACCION = {
    CONTRATO_REGISTRADO: "Contrato registrado",
    CONTRATO_RENOVADO: "Contrato renovado",
    CONTRATO_CANCELADO: "Contrato cancelado",
    CONTRATO_ALERTA: "Alerta de vencimiento enviada",
    RADIO_ASIGNADO: "Radio asignado",
    EQUIPO_AGREGADO: "Equipo agregado",
    EQUIPO_RETIRADO: "Equipo retirado",
    ACCESORIOS_ACTUALIZADOS: "Accesorios entregados actualizados",
};

const ESTADOS_RENOVABLES = ["Por vencer (90 días)", "Por vencer (30 días)", "Vencido"];
const ESTADOS_NO_CANCELABLES = ["Vencido", "Cancelado"];

function Resumen({ detalle }) {
    const { contrato, equipos } = detalle;
    const cancelado = contrato.estado === "Cancelado";

    return (
        <DetailGrid
            items={[
                { icon: Building2, label: "Empresa cliente", value: contrato.empresa },
                { icon: UserRound, label: "Vendedor", value: contrato.vendedor },
                { icon: CalendarPlus, label: "Fecha de inicio", value: fechaCorta(contrato.fechaInicio) },
                { icon: CalendarClock, label: "Fecha de vencimiento", value: fechaCorta(contrato.fechaVencimiento) },
                { icon: Wallet, label: "Monto mensual", value: colones(contrato.montoMensual) },
                { icon: ShieldCheck, label: "Cobertura de reparaciones", value: contrato.cubreReparaciones ? "Incluida" : "No incluida" },
                { icon: Radio, label: "Equipos asociados", value: String(equipos.length) },
                { icon: FileText, label: "Condiciones", value: contrato.condiciones, wide: true },
                ...(cancelado
                    ? [
                          { icon: CalendarX, label: "Fecha de cancelación", value: fechaCorta(contrato.fechaCancelacion) },
                          { icon: FileText, label: "Motivo de la cancelación", value: contrato.motivoCancelacion, wide: true },
                      ]
                    : []),
            ]}
        />
    );
}

function EquiposAccesorios({ detalle, onAsignarRadio, canAsignarRadio, canEditarAccesorios, onEditarAccesorios }) {
    const { contrato, equipos, accesorios } = detalle;

    return (
        <>
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs uppercase tracking-wide" style={{ color: COLORS.muted, fontWeight: 600 }}>
                        Equipos del contrato
                    </h3>
                    {canAsignarRadio && ["Activo", "Renovado"].includes(contrato.estadoRegistrado) && (
                        <Button onClick={onAsignarRadio}>Asignar radio</Button>
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
                                <tr><td colSpan={5} className="px-4 py-5 text-center text-sm" style={{ color: COLORS.muted }}>Este contrato no tiene equipos vigentes.</td></tr>
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

            <section className="mt-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs uppercase tracking-wide" style={{ color: COLORS.muted, fontWeight: 600 }}>
                        Accesorios entregados
                    </h3>
                    {canEditarAccesorios && ["Activo", "Renovado"].includes(contrato.estadoRegistrado) && (
                        <Button onClick={onEditarAccesorios}>Editar accesorios</Button>
                    )}
                </div>

                {accesorios.length === 0 ? (
                    <p className="text-sm" style={{ color: COLORS.muted }}>Este contrato no tiene accesorios asociados.</p>
                ) : (
                    <ul className="flex flex-wrap gap-2">
                        {accesorios.map((a) => (
                            <li key={a.idAccesorioModelo} className="rounded-lg px-3 py-2 text-sm" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}>
                                <span style={{ fontWeight: 600 }}>{a.cantidad} × {a.nombre}</span>
                                <span className="ml-2 text-xs" style={{ color: COLORS.muted }}>{a.modelo}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </>
    );
}

function Renovaciones({ idContrato }) {
    const [lista, setLista] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let activo = true;
        api.listarRenovaciones(idContrato)
            .then((r) => activo && setLista(r))
            .catch((e) => activo && setError(e instanceof ApiError ? e.message : "No se pudo cargar el historial."));
        return () => {
            activo = false;
        };
    }, [idContrato]);

    if (error) return <Notice tone="error">{error}</Notice>;
    if (!lista) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando historial...</p>;
    if (lista.length === 0) {
        return <p className="text-sm" style={{ color: COLORS.muted }}>Este contrato todavía no ha sido renovado.</p>;
    }

    return (
        <ol className="relative ml-2" style={{ borderLeft: `2px solid ${COLORS.border}` }}>
            {lista.map((r, i) => (
                <li key={i} className="pl-5 pb-5 relative">
                    <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.green, border: "2px solid white" }} />
                    <p className="text-sm" style={{ color: COLORS.charcoal, fontWeight: 600 }}>
                        Renovado hasta el {fechaCorta(r.nuevaFechaVencimiento)}
                    </p>
                    <p className="text-sm" style={{ color: COLORS.charcoal }}>
                        Vencimiento anterior: {fechaCorta(r.fechaVencimientoAnterior) || "sin registro"} · Monto mensual vigente: {colones(r.montoMensual)}
                    </p>
                    {r.observacion && <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>{r.observacion}</p>}
                    <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>{fechaCorta(r.fechaRenovacion)} · {r.usuario ?? "Sin registro"}</p>
                </li>
            ))}
        </ol>
    );
}

function Auditoria({ idContrato }) {
    const [lista, setLista] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let activo = true;
        api.listarAuditoriaContrato(idContrato)
            .then((r) => activo && setLista(r))
            .catch((e) => activo && setError(e instanceof ApiError ? e.message : "No se pudo cargar la auditoría."));
        return () => {
            activo = false;
        };
    }, [idContrato]);

    if (error) return <Notice tone="error">{error}</Notice>;
    if (!lista) return <p className="text-sm" style={{ color: COLORS.muted }}>Cargando auditoría...</p>;

    return (
        <>
            <p className="text-xs mb-4" style={{ color: COLORS.muted }}>
                Bitácora de solo lectura: los eventos no se pueden editar ni eliminar.
            </p>
            <ol className="relative ml-2" style={{ borderLeft: `2px solid ${COLORS.border}` }}>
                {lista.map((a) => (
                    <li key={a.idAuditoria} className="pl-5 pb-4 relative">
                        <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full" style={{ backgroundColor: a.accion === "CONTRATO_CANCELADO" ? COLORS.red : COLORS.green, border: "2px solid white" }} />
                        <p className="text-sm" style={{ color: COLORS.charcoal, fontWeight: 600 }}>{ETIQUETAS_ACCION[a.accion] ?? a.accion}</p>
                        {a.detalle && <p className="text-sm" style={{ color: COLORS.charcoal }}>{a.detalle}</p>}
                        <p className="text-xs" style={{ color: COLORS.muted }}>{fechaHora(a.fecha)} · {a.usuario}</p>
                    </li>
                ))}
            </ol>
        </>
    );
}

export default function ContratoDetalleModal({
    detalle,
    mensaje,
    canAsignarRadio,
    canRenovar,
    canCancelar,
    canVerAuditoria,
    onClose,
    onChanged,
}) {
    const [tab, setTab] = useState("resumen");
    const [accion, setAccion] = useState(null);
    const [aviso, setAviso] = useState("");

    if (!detalle) return null;
    const { contrato } = detalle;
    const mostrarRenovar = canRenovar && ESTADOS_RENOVABLES.includes(contrato.estado);
    const mostrarCancelar = canCancelar && !ESTADOS_NO_CANCELABLES.includes(contrato.estado);

    const tabs = [
        { key: "resumen", label: "Resumen" },
        { key: "equipos", label: "Equipos y accesorios" },
        ...(canRenovar || canVerAuditoria ? [{ key: "renovaciones", label: "Renovaciones" }] : []),
        ...(canVerAuditoria ? [{ key: "auditoria", label: "Auditoría" }] : []),
    ];

    function terminar(nuevo, texto) {
        setAccion(null);
        setAviso(texto);
        setTab("resumen");
        onChanged(nuevo);
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={`Contrato ${api.codigoContrato(contrato.idContrato)}`}
            subtitle={contrato.empresa}
            icon={FileText}
            width="max-w-3xl"
            headerExtra={<StatusBadge value={contrato.estado} />}
            tabs={tabs}
            activeTab={tab}
            onTabChange={setTab}
            footer={mostrarRenovar || mostrarCancelar ? (
                <>
                    {mostrarCancelar && (
                        <Button variant="danger" onClick={() => setAccion("cancelar")}>Cancelar contrato</Button>
                    )}
                    {mostrarRenovar && (
                        <Button variant="primary" onClick={() => setAccion("renovar")}>Renovar</Button>
                    )}
                </>
            ) : undefined}
        >
            {(mensaje || aviso) && <Notice>{aviso || mensaje}</Notice>}

            {tab === "resumen" && <Resumen detalle={detalle} />}
            {tab === "equipos" && (
                <EquiposAccesorios
                    detalle={detalle}
                    canAsignarRadio={canAsignarRadio}
                    onAsignarRadio={() => setAccion("radio")}
                    canEditarAccesorios={canRenovar}
                    onEditarAccesorios={() => setAccion("accesorios")}
                />
            )}
            {tab === "renovaciones" && <Renovaciones key={`${contrato.idContrato}-${contrato.fechaVencimiento}`} idContrato={contrato.idContrato} />}
            {tab === "auditoria" && <Auditoria key={`${contrato.idContrato}-${contrato.estado}-${contrato.fechaVencimiento}-${detalle.equipos.length}`} idContrato={contrato.idContrato} />}

            {accion === "radio" && (
                <AsignarRadioModal
                    idContratoInicial={contrato.idContrato}
                    onClose={() => setAccion(null)}
                    onSaved={(nuevo, serie) => terminar(nuevo, `El radio ${serie} se asignó correctamente al contrato.`)}
                />
            )}
            {accion === "accesorios" && (
                <AccesoriosContratoModal
                    detalle={detalle}
                    onClose={() => setAccion(null)}
                    onSaved={(nuevo) => terminar(nuevo, "Los accesorios entregados se actualizaron correctamente.")}
                />
            )}
            {accion === "renovar" && (
                <RenovarContratoModal
                    detalle={detalle}
                    onClose={() => setAccion(null)}
                    onSaved={(nuevo) => terminar(nuevo, "El contrato se renovó correctamente y el historial quedó registrado.")}
                />
            )}
            {accion === "cancelar" && (
                <CancelarContratoModal
                    detalle={detalle}
                    onClose={() => setAccion(null)}
                    onSaved={(nuevo) => terminar(nuevo, "El contrato se canceló y sus equipos quedaron disponibles en el inventario.")}
                />
            )}
        </Modal>
    );
}
