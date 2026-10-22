import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ClipboardCheck } from "lucide-react";
import Modal from "../Modal";
import { Button, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import { fechaHora } from "./helpers";

// Checklist digital de requisitos técnicos previos a la instalación de una repetidora.
// Cada guardado crea una nueva verificación; la última define si la repetidora está lista para instalación.
export default function ChecklistInstalacionModal({ repetidora, canEditar, onClose, onSaved }) {
    const [datos, setDatos] = useState(null);
    const [marcados, setMarcados] = useState([]);
    const [observaciones, setObservaciones] = useState("");
    const [resultado, setResultado] = useState(null);
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        let activo = true;
        api.obtenerChecklist(repetidora.numeroSerie)
            .then((d) => {
                if (!activo) return;
                setDatos(d);
                setMarcados(d.requisitos.filter((r) => r.cumplido).map((r) => r.idRequisito));
                setObservaciones(d.ultima?.observaciones ?? "");
            })
            .catch((e) => activo && setError(e instanceof ApiError ? e.message : "No se pudo cargar el checklist."));
        return () => {
            activo = false;
        };
    }, [repetidora.numeroSerie]);

    const alternar = (id) => setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

    async function guardar(e) {
        e.preventDefault();
        setError("");
        setResultado(null);
        setGuardando(true);
        try {
            const r = await api.guardarChecklist(repetidora.numeroSerie, { cumplidos: marcados, observaciones });
            setDatos(r);
            setResultado(r);
            setMarcados(r.requisitos.filter((x) => x.cumplido).map((x) => x.idRequisito));
            onSaved?.(r);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo guardar el checklist.");
        } finally {
            setGuardando(false);
        }
    }

    const pendientesAhora = datos ? datos.requisitos.filter((r) => !marcados.includes(r.idRequisito)).length : 0;

    return (
        <Modal
            open
            onClose={onClose}
            icon={ClipboardCheck}
            title="Checklist previo a la instalación"
            subtitle={`${repetidora.marca} ${repetidora.modelo} · serie ${repetidora.numeroSerie}`}
            width="max-w-2xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cerrar</Button>
                    {canEditar && (
                        <Button variant="primary" type="submit" form="form-checklist" disabled={guardando || !datos}>
                            {guardando ? "Guardando..." : "Guardar checklist"}
                        </Button>
                    )}
                </div>
            }
        >
            {error && <Notice tone="error">{error}</Notice>}
            {resultado && <Notice tone={resultado.listaParaInstalacion ? "success" : "warning"}>
                <p style={{ fontWeight: 600 }}>{resultado.mensaje}</p>
                {resultado.advertencia && <p className="mt-1">{resultado.advertencia}</p>}
                {resultado.listaParaInstalacion && <p className="mt-1">Ya se puede registrar la instalación de la repetidora.</p>}
            </Notice>}

            {!datos ? (
                !error && <p className="text-sm" style={{ color: COLORS.muted }}>Cargando checklist...</p>
            ) : (
                <form id="form-checklist" onSubmit={guardar}>
                    {datos.ultima ? (
                        <p className="text-xs mb-3" style={{ color: COLORS.muted }}>
                            Última verificación: {fechaHora(datos.ultima.fechaVerificacion)} por {datos.ultima.usuario ?? "—"} ·{" "}
                            <strong style={{ color: datos.ultima.completado ? COLORS.greenDark : COLORS.red }}>
                                {datos.ultima.completado ? "Completo" : `Incompleto (${datos.ultima.pendientes} pendiente(s))`}
                            </strong>
                        </p>
                    ) : (
                        <p className="text-xs mb-3" style={{ color: COLORS.muted }}>Todavía no se ha verificado esta repetidora.</p>
                    )}

                    <ul className="divide-y rounded-lg border" style={{ borderColor: COLORS.border }}>
                        {datos.requisitos.map((r) => {
                            const cumplido = marcados.includes(r.idRequisito);
                            return (
                                <li key={r.idRequisito}>
                                    <label className={`flex items-center gap-3 px-4 py-2.5 text-sm ${canEditar ? "cursor-pointer" : ""}`}>
                                        {canEditar ? (
                                            <input
                                                type="checkbox"
                                                checked={cumplido}
                                                onChange={() => alternar(r.idRequisito)}
                                                className="w-4 h-4"
                                                style={{ accentColor: COLORS.green }}
                                            />
                                        ) : cumplido ? (
                                            <CheckCircle2 size={16} color={COLORS.green} />
                                        ) : (
                                            <XCircle size={16} color={COLORS.red} />
                                        )}
                                        <span>{r.nombre}</span>
                                        {datos.ultima && !cumplido && (
                                            <span className="ml-auto text-xs" style={{ color: COLORS.red, fontWeight: 600 }}>No cumplido</span>
                                        )}
                                    </label>
                                </li>
                            );
                        })}
                    </ul>

                    {canEditar && (
                        <>
                            <p className="text-xs mt-3" style={{ color: pendientesAhora ? COLORS.red : COLORS.greenDark, fontWeight: 600 }}>
                                {pendientesAhora
                                    ? `${pendientesAhora} requisito(s) sin marcar: se guardará como incompleto.`
                                    : "Todos los requisitos están marcados como cumplidos."}
                            </p>
                            <label className="block mt-3">
                                <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Observaciones</span>
                                <textarea
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    rows={2}
                                    maxLength={1000}
                                    placeholder="Detalle de los requisitos pendientes o notas de la verificación"
                                    className={inputClass}
                                    style={inputStyle}
                                />
                            </label>
                        </>
                    )}

                    {datos.historial.length > 0 && (
                        <div className="mt-5">
                            <p className="text-xs uppercase tracking-wide mb-2" style={{ color: COLORS.muted, fontWeight: 600 }}>Historial de verificaciones</p>
                            <ul className="text-sm space-y-1">
                                {datos.historial.map((h) => (
                                    <li key={h.idChecklist} className="flex flex-wrap gap-x-3">
                                        <span>{fechaHora(h.fechaVerificacion)}</span>
                                        <span style={{ color: COLORS.muted }}>{h.usuario ?? "—"}</span>
                                        <span style={{ color: h.completado ? COLORS.greenDark : COLORS.red, fontWeight: 600 }}>
                                            {h.completado ? "Completo" : `Incompleto (${h.pendientes} pendiente(s))`}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </form>
            )}
        </Modal>
    );
}
