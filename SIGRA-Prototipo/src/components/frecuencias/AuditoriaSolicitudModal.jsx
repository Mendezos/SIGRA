import { useEffect, useState } from "react";
import { Bot, Lock, Pencil, Trash2, UserRound } from "lucide-react";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { Button, Notice } from "../ui";
import { COLORS } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import { formatearFechaHoraExacta } from "../../utils/format";
import * as api from "../../services/frecuenciasService";

// Bitácora de auditoría completa de una solicitud (solo Administrador). Es de solo lectura: las opciones de editar y
// eliminar existen únicamente para dejar claro que el sistema las rechaza.
export default function AuditoriaSolicitudModal({ solicitud: s, onClose }) {
    const [auditoria, setAuditoria] = useState(null);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");

    useEffect(() => {
        let activo = true;
        api.obtenerAuditoria(s.idSolicitud)
            .then((a) => activo && setAuditoria(a))
            .catch((e) => activo && setError(e instanceof ApiError ? e.message : "No se pudo cargar la bitácora de auditoría."));
        return () => {
            activo = false;
        };
    }, [s.idSolicitud]);

    async function intentar(accion, evento) {
        setAviso("");
        try {
            await (accion === "editar"
                ? api.editarEventoAuditoria(s.idSolicitud, evento.idAuditoria)
                : api.eliminarEventoAuditoria(s.idSolicitud, evento.idAuditoria));
        } catch (e) {
            setAviso(e instanceof ApiError ? e.message : "La bitácora de auditoría es de solo lectura.");
        }
    }

    const eventos = auditoria?.eventos ?? [];

    return (
        <Modal
            open
            onClose={onClose}
            title={`Auditoría · ${api.codigoSolicitud(s.idSolicitud)}`}
            subtitle={`${s.empresa} · ${s.frecuencia} · repetidora ${s.numeroSerie}`}
            width="max-w-3xl"
            footer={
                <div className="flex justify-end">
                    <Button variant="ghost" onClick={onClose}>Cerrar</Button>
                </div>
            }
        >
            {error && <Notice tone="error">{error}</Notice>}
            {!error && !auditoria && <p className="text-sm" style={{ color: COLORS.muted }}>Cargando bitácora...</p>}

            {auditoria && (
                <>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
                        <div>
                            <p className="text-xs mb-0.5" style={{ color: COLORS.muted }}>Estado actual</p>
                            <StatusBadge value={auditoria.solicitud.estado} />
                        </div>
                        <div>
                            <p className="text-xs mb-0.5" style={{ color: COLORS.muted }}>Vendedor responsable</p>
                            <p className="text-sm" style={{ color: COLORS.charcoal }}>{auditoria.solicitud.vendedor}</p>
                        </div>
                        <p className="ml-auto inline-flex items-center gap-1.5 text-xs" style={{ color: COLORS.muted }}>
                            <Lock size={13} /> Bitácora de solo lectura · {eventos.length} evento(s) · orden cronológico
                        </p>
                    </div>

                    {aviso && <Notice tone="warning">{aviso}</Notice>}

                    {eventos.length === 0 ? (
                        <p className="text-sm" style={{ color: COLORS.muted }}>Esta solicitud no tiene eventos registrados en la bitácora.</p>
                    ) : (
                        <ol className="space-y-3">
                            {eventos.map((ev, i) => (
                                <li key={ev.idAuditoria} className="rounded-lg border p-4" style={{ borderColor: COLORS.border }}>
                                    <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                                        <span
                                            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                                            style={{ backgroundColor: COLORS.greenTint, color: COLORS.greenDark, fontWeight: 700 }}
                                        >
                                            {i + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm" style={{ fontWeight: 600, color: COLORS.charcoal }}>{ev.evento}</p>
                                            <p className="text-xs mt-0.5 inline-flex flex-wrap items-center gap-x-2" style={{ color: COLORS.muted }}>
                                                <span>{formatearFechaHoraExacta(ev.fecha)}</span>
                                                <span className="inline-flex items-center gap-1">
                                                    {ev.automatico ? <Bot size={12} /> : <UserRound size={12} />}
                                                    {ev.usuario}
                                                    {ev.rol ? ` · ${ev.rol}` : ""}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <Button className="flex items-center gap-1 text-xs" style={{ padding: "0.375rem 0.625rem" }} onClick={() => intentar("editar", ev)} title="Editar evento">
                                                <Pencil size={12} /> Editar
                                            </Button>
                                            <Button variant="danger" className="flex items-center gap-1 text-xs" style={{ padding: "0.375rem 0.625rem" }} onClick={() => intentar("eliminar", ev)} title="Eliminar evento">
                                                <Trash2 size={12} /> Eliminar
                                            </Button>
                                        </div>
                                    </div>
                                    {ev.detalle && (
                                        <p className="text-sm mt-2 pl-9 whitespace-pre-line" style={{ color: COLORS.charcoal }}>{ev.detalle}</p>
                                    )}
                                </li>
                            ))}
                        </ol>
                    )}
                </>
            )}
        </Modal>
    );
}
