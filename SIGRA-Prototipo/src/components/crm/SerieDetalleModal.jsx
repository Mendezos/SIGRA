import { useState } from "react";
import { Ban, Building2, CalendarClock, ClipboardList, Eye, Flag, Repeat, UserRound, Users } from "lucide-react";
import Modal from "../Modal";
import { Button, DetailGrid, Notice } from "../ui";
import { COLORS } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/crmSeguimientosService";
import { formatearFechaHora } from "../../utils/format";
import { fechaHoraLocal, fechaLocal, horaLocal, puedeCrearCrm } from "./helpers";
import SerieCancelarModal from "./SerieCancelarModal";
import SeguimientoDetalleModal from "./SeguimientoDetalleModal";
import { SeguimientoEstadoPill } from "./SeguimientoPills";

// Detalle de una serie de contactos periódicos con todos sus seguimientos.
// onChanged recibe la respuesta del servidor al cancelar la serie ({ aplicado, mensaje, serie }).
export default function SerieDetalleModal({ serie: inicial, user, onClose, onChanged }) {
    const [serie, setSerie] = useState(inicial);
    const [cancelando, setCancelando] = useState(false);
    const [seguimiento, setSeguimiento] = useState(null);
    const [mensaje, setMensaje] = useState(null);
    const [error, setError] = useState("");

    const s = serie;
    const puedeCancelar = s.estado === "Activa" && puedeCrearCrm(user) && api.esResponsableOAdmin(user, s.idResponsable);

    async function abrirSeguimiento(id) {
        setError("");
        try {
            setSeguimiento(await api.obtenerSeguimiento(id));
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo abrir el seguimiento.");
        }
    }

    // Se cerró, reprogramó o canceló un seguimiento de la serie: se vuelve a leer la serie para actualizar su avance.
    async function alCambiarSeguimiento(resultado) {
        setSeguimiento(null);
        setMensaje({ tono: resultado.aplicado ? "success" : "warning", texto: resultado.mensaje });
        try {
            setSerie(await api.obtenerSerie(s.idSerie));
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo actualizar la serie.");
        }
    }

    const items = [
        { icon: Building2, label: s.tipoEmpresa, value: s.empresa },
        { icon: UserRound, label: "Contacto", value: s.contacto },
        { icon: Repeat, label: "Periodicidad", value: `${s.periodicidad} · desde el ${fechaLocal(s.fechaInicial)} a las ${s.hora}` },
        { icon: ClipboardList, label: "Tipo de seguimiento", value: s.tipo },
        { icon: Flag, label: "Prioridad", value: s.prioridad },
        { icon: Users, label: "Responsable", value: s.responsable },
        { icon: CalendarClock, label: "Próxima fecha", value: s.proximaFecha ? fechaHoraLocal(s.proximaFecha) : "Sin seguimientos pendientes" },
        { icon: ClipboardList, label: "Avance", value: `${s.completados} completado(s) de ${s.total} · ${s.pendientes} pendiente(s) · ${s.cancelados} cancelado(s)` },
        { icon: ClipboardList, label: "Motivo", value: s.motivo, wide: true },
        ...(s.estado === "Cancelada"
            ? [
                  { icon: UserRound, label: "Cancelada por", value: s.usuarioCancela },
                  { icon: CalendarClock, label: "Fecha de cancelación", value: formatearFechaHora(s.fechaCancelacion) },
                  { icon: ClipboardList, label: "Motivo de la cancelación", value: s.motivoCancelacion, wide: true },
              ]
            : []),
    ];

    return (
        <>
            <Modal
                open
                onClose={onClose}
                icon={Repeat}
                title={`Contacto periódico ${s.codigo}`}
                subtitle={`${s.empresa} · ${s.periodicidad}`}
                width="max-w-3xl"
                headerExtra={<SeguimientoEstadoPill estado={s.estado} />}
                footer={
                    puedeCancelar ? (
                        <div className="flex justify-end">
                            <Button variant="danger" className="flex items-center gap-1.5" onClick={() => setCancelando(true)}>
                                <Ban size={15} /> Cancelar serie
                            </Button>
                        </div>
                    ) : undefined
                }
            >
                {mensaje && <Notice tone={mensaje.tono}>{mensaje.texto}</Notice>}
                {error && <Notice tone="error">{error}</Notice>}
                {s.estado === "Cancelada" && <Notice tone="warning">La serie está cancelada. Sus seguimientos completados y los atrasados sin cerrar se conservan.</Notice>}

                <DetailGrid title="Configuración de la serie" items={items} />

                <h3 className="flex items-center gap-2 text-xs uppercase tracking-wide mb-3 mt-6" style={{ color: COLORS.greenDark, fontWeight: 600 }}>
                    <span className="inline-block w-1 h-3.5 rounded-full" style={{ backgroundColor: COLORS.green }} />
                    Seguimientos de la serie ({s.seguimientos.length})
                </h3>
                <div className="rounded-xl overflow-auto" style={{ border: `1px solid ${COLORS.border}` }}>
                    <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                        <thead style={{ backgroundColor: COLORS.greenTint }}>
                            <tr>
                                {["Código", "Fecha", "Hora", "Estado", ""].map((c) => (
                                    <th key={c || "acciones"} className="px-3 py-2 text-xs uppercase tracking-wide text-left" style={{ color: COLORS.muted, fontWeight: 600 }}>{c}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {s.seguimientos.map((g) => (
                                <tr key={g.idSeguimiento} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                                    <td className="px-3 py-2 whitespace-nowrap">{g.codigo}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{fechaLocal(g.fechaHora)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{horaLocal(g.fechaHora)}</td>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <SeguimientoEstadoPill estado={g.estado} />
                                            {g.estado === "Atrasado" && <span className="text-xs" style={{ color: COLORS.red }}>{api.textoTranscurrido(g.minutosAtraso)}</span>}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <Button className="flex items-center gap-1.5 !px-3 !py-1.5 text-xs ml-auto" aria-label={`Ver seguimiento ${g.codigo}`} onClick={() => abrirSeguimiento(g.idSeguimiento)}>
                                            <Eye size={13} /> Ver
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {s.seguimientos.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-sm" style={{ color: COLORS.muted }}>La serie no tiene seguimientos.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Modal>

            {cancelando && <SerieCancelarModal serie={s} onClose={() => setCancelando(false)} onDone={onChanged} />}

            {seguimiento && (
                <SeguimientoDetalleModal
                    key={`${seguimiento.idSeguimiento}-${seguimiento.estado}`}
                    seguimiento={seguimiento}
                    user={user}
                    onClose={() => setSeguimiento(null)}
                    onChanged={alCambiarSeguimiento}
                />
            )}
        </>
    );
}
