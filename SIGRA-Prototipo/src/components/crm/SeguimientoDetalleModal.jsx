import { useState } from "react";
import { Ban, Building2, CalendarCheck, CalendarClock, CheckCircle2, ClipboardList, Flag, Link2, Repeat, UserRound, Users } from "lucide-react";
import Modal from "../Modal";
import { Button, DetailGrid, Notice } from "../ui";
import { COLORS } from "../uiTheme";
import * as api from "../../services/crmSeguimientosService";
import { formatearFechaHora } from "../../utils/format";
import { fechaHoraLocal, puedeEditarCrm } from "./helpers";
import SeguimientoCancelarModal from "./SeguimientoCancelarModal";
import SeguimientoCompletarModal from "./SeguimientoCompletarModal";
import { SeguimientoEstadoPill, SeguimientoPrioridadPill } from "./SeguimientoPills";
import SeguimientoReprogramarModal from "./SeguimientoReprogramarModal";

function descripcionHistorial(h) {
    switch (h.accion) {
        case "Creado":
            return `Programado para el ${fechaHoraLocal(h.fechaHoraNueva)}`;
        case "Reprogramado":
            return `Reprogramado del ${fechaHoraLocal(h.fechaHoraAnterior)} al ${fechaHoraLocal(h.fechaHoraNueva)}`;
        case "Completado":
            return "Completado";
        case "Cancelado":
            return "Cancelado";
        default:
            return h.accion;
    }
}

// Detalle de un seguimiento con su historial y las acciones permitidas (reprogramar, completar, cancelar).
// onChanged recibe la respuesta del servidor ({ aplicado, mensaje, seguimiento }) cuando se hizo una acción.
export default function SeguimientoDetalleModal({ seguimiento: s, user, onClose, onChanged }) {
    const [pestana, setPestana] = useState("detalle");
    const [accion, setAccion] = useState(null);

    const abierto = api.estaAbierto(s);
    const puedeActuar = puedeEditarCrm(user) && api.esResponsableOAdmin(user, s.idResponsable);
    const cerrado = s.estado === "Completado" || s.estado === "Cancelado";

    const items = [
        { icon: Building2, label: s.tipoEmpresa, value: s.empresa },
        { icon: UserRound, label: "Contacto", value: s.contacto },
        { icon: CalendarClock, label: "Programado para", value: fechaHoraLocal(s.fechaHora) },
        { icon: ClipboardList, label: "Tipo de seguimiento", value: s.tipo },
        { icon: Flag, label: "Prioridad", value: s.prioridad },
        { icon: Users, label: "Responsable", value: s.responsable },
        { icon: s.idSerie ? Repeat : CalendarCheck, label: "Origen", value: s.idSerie ? `Contacto periódico ${api.codigoSerie(s.idSerie)}` : s.origen },
        ...(s.estado === "Atrasado" ? [{ icon: CalendarClock, label: "Tiempo de atraso", value: api.textoTranscurrido(s.minutosAtraso) }] : []),
        ...(s.reprogramado ? [{ icon: CalendarClock, label: "Programación original", value: fechaHoraLocal(s.fechaHoraOriginal) }] : []),
        { icon: ClipboardList, label: "Motivo", value: s.motivo, wide: true },
    ];

    const cierre = [
        ...(s.estado === "Completado"
            ? [
                  { icon: CalendarCheck, label: "Fecha real", value: fechaHoraLocal(s.fechaReal) },
                  { icon: UserRound, label: "Completado por", value: s.usuarioCierre },
                  { icon: ClipboardList, label: "Resultado", value: s.resultado, wide: true },
                  { icon: ClipboardList, label: "Observaciones", value: s.observaciones, wide: true },
                  { icon: ClipboardList, label: "Próximo paso", value: s.proximoPaso, wide: true },
                  { icon: Link2, label: "Interacción vinculada", value: s.idInteraccion ? `Registrada en el historial comercial (interacción #${s.idInteraccion})` : "" , wide: true },
              ]
            : []),
        ...(s.estado === "Cancelado"
            ? [
                  { icon: UserRound, label: "Cancelado por", value: s.usuarioCierre },
                  { icon: CalendarCheck, label: "Fecha de cancelación", value: formatearFechaHora(s.fechaCierre) },
                  { icon: ClipboardList, label: "Motivo de la cancelación", value: s.motivoCancelacion, wide: true },
              ]
            : []),
    ];

    return (
        <>
            <Modal
                open
                onClose={onClose}
                icon={CalendarClock}
                title={`Seguimiento ${s.codigo}`}
                subtitle={`${s.empresa} · ${s.tipo}`}
                width="max-w-2xl"
                headerExtra={
                    <div className="flex items-center gap-2">
                        <SeguimientoPrioridadPill prioridad={s.prioridad} />
                        <SeguimientoEstadoPill estado={s.estado} />
                    </div>
                }
                tabs={[
                    { key: "detalle", label: "Detalle" },
                    { key: "historial", label: `Historial (${s.historial?.length ?? 0})` },
                ]}
                activeTab={pestana}
                onTabChange={setPestana}
                footer={
                    abierto && puedeActuar ? (
                        <div className="flex flex-wrap justify-end gap-3">
                            <Button variant="danger" className="flex items-center gap-1.5" onClick={() => setAccion("cancelar")}>
                                <Ban size={15} /> Cancelar seguimiento
                            </Button>
                            <Button className="flex items-center gap-1.5" onClick={() => setAccion("reprogramar")}>
                                <CalendarClock size={15} /> Reprogramar
                            </Button>
                            <Button variant="primary" className="flex items-center gap-1.5" onClick={() => setAccion("completar")}>
                                <CheckCircle2 size={15} /> Completar
                            </Button>
                        </div>
                    ) : undefined
                }
            >
                {s.estado === "Atrasado" && (
                    <Notice tone="warning">La fecha programada ya pasó ({api.textoTranscurrido(s.minutosAtraso)}). Complételo, reprográmelo o cancélelo.</Notice>
                )}
                {abierto && !puedeActuar && puedeEditarCrm(user) && (
                    <Notice tone="warning">Solo el responsable del seguimiento o un administrador puede reprogramarlo, completarlo o cancelarlo.</Notice>
                )}
                {cerrado && <Notice tone="warning">El seguimiento ya está cerrado; cree un seguimiento nuevo si necesita volver a contactar.</Notice>}

                {pestana === "detalle" && (
                    <>
                        <DetailGrid title="Programación" items={items} />
                        {cierre.length > 0 && <DetailGrid title={s.estado === "Completado" ? "Cierre del seguimiento" : "Cancelación"} items={cierre} />}
                    </>
                )}

                {pestana === "historial" && (
                    <ol className="relative ml-2" style={{ borderLeft: `2px solid ${COLORS.border}` }}>
                        {(s.historial ?? []).map((h) => (
                            <li key={h.idHistorial} className="pl-5 pb-4 relative">
                                <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.green, border: "2px solid white" }} />
                                <p className="text-sm" style={{ color: COLORS.charcoal, fontWeight: 500 }}>{descripcionHistorial(h)}</p>
                                {h.motivo && <p className="text-xs" style={{ color: COLORS.muted }}>{h.accion === "Completado" ? "Resultado: " : "Motivo: "}{h.motivo}</p>}
                                <p className="text-xs" style={{ color: COLORS.muted }}>{formatearFechaHora(h.fecha)} · {h.usuario ?? "Sistema"}</p>
                            </li>
                        ))}
                        {(s.historial ?? []).length === 0 && <li className="pl-5 text-sm" style={{ color: COLORS.muted }}>Sin movimientos registrados.</li>}
                    </ol>
                )}
            </Modal>

            {accion === "reprogramar" && <SeguimientoReprogramarModal seguimiento={s} onClose={() => setAccion(null)} onDone={onChanged} />}
            {accion === "completar" && <SeguimientoCompletarModal seguimiento={s} onClose={() => setAccion(null)} onDone={onChanged} />}
            {accion === "cancelar" && <SeguimientoCancelarModal seguimiento={s} onClose={() => setAccion(null)} onDone={onChanged} />}
        </>
    );
}
