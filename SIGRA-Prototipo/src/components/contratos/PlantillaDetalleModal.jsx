import { useState } from "react";
import { FileText, Pencil, Power } from "lucide-react";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { Button, DetailGrid, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/contratosService";
import PlantillaFormModal from "./PlantillaFormModal";
import { fechaHora } from "../alquiler/helpers";

const TABS = [
    { key: "contenido", label: "Contenido" },
    { key: "versiones", label: "Versiones" },
    { key: "estados", label: "Activaciones" },
];

export default function PlantillaDetalleModal({ detalle, categorias, canAdministrar, onClose, onChanged }) {
    const [tab, setTab] = useState("contenido");
    const [version, setVersion] = useState(null);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [editando, setEditando] = useState(false);
    const [cambiandoEstado, setCambiandoEstado] = useState(false);
    const [motivo, setMotivo] = useState("");
    const [ocupado, setOcupado] = useState(false);

    if (!detalle) return null;
    const mostrada = version ?? detalle;
    const esVigente = !version || version.versionMostrada === detalle.versionActual;

    async function verVersion(numero) {
        setError("");
        try {
            setVersion(numero === detalle.versionActual ? null : await api.obtenerPlantilla(detalle.id, numero));
            setTab("contenido");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo abrir la versión.");
        }
    }

    async function cambiarEstado(e) {
        e.preventDefault();
        setOcupado(true);
        setError("");
        try {
            const r = await api.cambiarEstadoPlantilla(detalle.id, !detalle.activa, motivo);
            setMensaje(r.mensaje);
            setCambiandoEstado(false);
            setMotivo("");
            onChanged(r.plantilla);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo cambiar el estado.");
        } finally {
            setOcupado(false);
        }
    }

    const acciones = canAdministrar && (
        <div className="flex gap-2">
            {detalle.activa && <Button className="flex items-center gap-1.5" onClick={() => { setMensaje(""); setEditando(true); }}><Pencil size={14} /> Editar</Button>}
            <Button variant={detalle.activa ? "danger" : "primary"} className="flex items-center gap-1.5" onClick={() => { setMensaje(""); setError(""); setCambiandoEstado(true); }}>
                <Power size={14} /> {detalle.activa ? "Desactivar" : "Reactivar"}
            </Button>
        </div>
    );

    return (
        <>
            <Modal
                open
                onClose={onClose}
                icon={FileText}
                title={detalle.nombre}
                subtitle={`${detalle.tipoEquipo} · versión vigente ${detalle.versionActual}`}
                width="max-w-3xl"
                headerExtra={<StatusBadge value={detalle.activa ? "Activa" : "Inactiva"} />}
                tabs={TABS}
                activeTab={tab}
                onTabChange={setTab}
                footer={<div className="flex justify-between gap-3">{acciones || <span />}<Button variant="ghost" onClick={onClose}>Cerrar</Button></div>}
            >
                {mensaje && <Notice>{mensaje}</Notice>}
                {error && <Notice tone="error">{error}</Notice>}

                {tab === "contenido" && (
                    <>
                        {!esVigente && (
                            <Notice tone="warning">
                                Está viendo la versión {mostrada.versionMostrada}, que ya no es la vigente.{" "}
                                <button type="button" className="underline" onClick={() => verVersion(detalle.versionActual)}>Ver la versión vigente</button>
                            </Notice>
                        )}
                        <DetailGrid
                            items={[
                                { label: "Cláusulas", value: mostrada.clausulas, wide: true },
                                { label: "Responsabilidades del cliente", value: mostrada.responsabilidades, wide: true },
                                { label: "Condiciones de cancelación anticipada", value: mostrada.condicionesCancelacion || "No se definieron", wide: true },
                            ]}
                        />
                    </>
                )}

                {tab === "versiones" && (
                    <ul className="space-y-2">
                        {detalle.versiones.map((v) => (
                            <li key={v.version} className="flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm" style={{ border: `1px solid ${COLORS.border}` }}>
                                <span>
                                    <strong>Versión {v.version}</strong>{v.version === detalle.versionActual && " (vigente)"}
                                    <span style={{ color: COLORS.muted }}> · {v.usuario} · {fechaHora(v.fecha)}</span>
                                    {v.motivo && <span className="block" style={{ color: COLORS.muted }}>{v.motivo}</span>}
                                </span>
                                <Button onClick={() => verVersion(v.version)}>Ver</Button>
                            </li>
                        ))}
                    </ul>
                )}

                {tab === "estados" && (
                    detalle.cambios.length === 0 ? (
                        <p className="text-sm" style={{ color: COLORS.muted }}>La plantilla nunca se ha desactivado.</p>
                    ) : (
                        <ul className="space-y-2">
                            {detalle.cambios.map((c, i) => (
                                <li key={i} className="rounded-lg px-4 py-3 text-sm" style={{ border: `1px solid ${COLORS.border}` }}>
                                    <strong>{c.activa ? "Reactivada" : "Desactivada"}</strong>
                                    <span style={{ color: COLORS.muted }}> · {c.usuario} · {fechaHora(c.fecha)}</span>
                                    {c.motivo && <span className="block" style={{ color: COLORS.muted }}>{c.motivo}</span>}
                                </li>
                            ))}
                        </ul>
                    )
                )}
            </Modal>

            {editando && (
                <PlantillaFormModal
                    plantilla={detalle}
                    categorias={categorias}
                    onClose={() => setEditando(false)}
                    onSaved={(nueva) => { setEditando(false); setVersion(null); setMensaje(`Se guardó la versión ${nueva.versionActual}. Los contratos anteriores conservan la suya.`); onChanged(nueva); }}
                />
            )}

            <Modal
                open={cambiandoEstado}
                onClose={() => setCambiandoEstado(false)}
                icon={Power}
                tone={detalle.activa ? "danger" : "default"}
                title={detalle.activa ? "Desactivar plantilla" : "Reactivar plantilla"}
                subtitle={detalle.nombre}
                width="max-w-lg"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setCambiandoEstado(false)}>Volver</Button>
                        <Button variant={detalle.activa ? "danger" : "primary"} type="submit" form="form-estado-plantilla" disabled={ocupado}>
                            {detalle.activa ? "Desactivar" : "Reactivar"}
                        </Button>
                    </div>
                }
            >
                {error && <Notice tone="error">{error}</Notice>}
                <p className="text-sm mb-4">
                    {detalle.activa
                        ? "La plantilla deja de ofrecerse en contratos nuevos. Los contratos que ya la usan no cambian."
                        : "La plantilla se podrá usar de nuevo en contratos nuevos."}
                </p>
                <form id="form-estado-plantilla" onSubmit={cambiarEstado}>
                    <FieldLabel label={detalle.activa ? "Motivo *" : "Motivo (opcional)"}>
                        <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} maxLength={300} className={inputClass} style={inputStyle} autoFocus />
                    </FieldLabel>
                </form>
            </Modal>
        </>
    );
}
