import { useEffect, useState } from "react";
import { Plus, X, RefreshCw } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import { colones, fechaCorta } from "./helpers";

export default function RenovarContratoModal({ detalle, onClose, onSaved }) {
    const { contrato, equipos } = detalle;
    const [disponibles, setDisponibles] = useState([]);
    const [nuevaFecha, setNuevaFecha] = useState("");
    const [nuevoMonto, setNuevoMonto] = useState("");
    const [observacion, setObservacion] = useState("");
    const [retirar, setRetirar] = useState([]);
    const [series, setSeries] = useState([]);
    const [serieNueva, setSerieNueva] = useState("");
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        let activo = true;
        api.listarEquiposDisponibles()
            .then((lista) => activo && setDisponibles(lista))
            .catch(() => {});
        return () => {
            activo = false;
        };
    }, []);

    function alternarRetiro(idEquipo) {
        setRetirar((lista) => (lista.includes(idEquipo) ? lista.filter((x) => x !== idEquipo) : [...lista, idEquipo]));
    }

    function agregarSerie() {
        const serie = serieNueva.trim();
        if (!serie) return;
        if (series.some((s) => s.toLowerCase() === serie.toLowerCase())) {
            setError("Ese número de serie ya está en la lista.");
            return;
        }
        setError("");
        setSeries((lista) => [...lista, serie]);
        setSerieNueva("");
    }

    async function guardar(e) {
        e.preventDefault();
        setError("");
        setGuardando(true);
        try {
            const nuevo = await api.renovarContrato(contrato.idContrato, {
                nuevaFechaVencimiento: nuevaFecha || null,
                nuevoMonto: nuevoMonto === "" ? null : Number(nuevoMonto),
                observacion: observacion || null,
                seriesAgregar: serieNueva.trim() ? [...series, serieNueva.trim()] : series,
                idsRetirar: retirar,
            });
            onSaved(nuevo);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo renovar el contrato.");
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={RefreshCw}
            title={`Renovar contrato ${api.codigoContrato(contrato.idContrato)}`}
            subtitle={`${contrato.empresa} · vence el ${fechaCorta(contrato.fechaVencimiento)} · ${colones(contrato.montoMensual)} al mes`}
            width="max-w-2xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-renovar" disabled={guardando}>
                        {guardando ? "Renovando..." : "Confirmar renovación"}
                    </Button>
                </div>
            }
        >
            {error && <Notice tone="error">{error}</Notice>}

            <form id="form-renovar" onSubmit={guardar} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldLabel label="Nueva fecha de vencimiento *">
                    <input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} className={inputClass} style={inputStyle} />
                </FieldLabel>
                <FieldLabel label="Nuevo monto mensual (₡), si cambia">
                    <input type="number" min="0" step="0.01" value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)} placeholder={String(contrato.montoMensual)} className={inputClass} style={inputStyle} />
                </FieldLabel>

                <div className="sm:col-span-2">
                    <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>
                        Equipos que el cliente ya no desea mantener (quedan Disponibles)
                    </span>
                    <ul className="flex flex-col gap-1.5">
                        {equipos.map((e) => (
                            <li key={e.idEquipo}>
                                <label className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 cursor-pointer" style={{ border: `1px solid ${COLORS.border}` }}>
                                    <input type="checkbox" checked={retirar.includes(e.idEquipo)} onChange={() => alternarRetiro(e.idEquipo)} style={{ accentColor: COLORS.red }} />
                                    <span style={{ fontWeight: 600, color: COLORS.charcoal }}>{e.numeroSerie}</span>
                                    <span className="text-xs" style={{ color: COLORS.muted }}>{e.marca} {e.modelo}</span>
                                    {retirar.includes(e.idEquipo) && <span className="ml-auto text-xs" style={{ color: COLORS.red }}>Se retira</span>}
                                </label>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="sm:col-span-2">
                    <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>Equipos nuevos que se agregan (número de serie)</span>
                    <div className="flex gap-2">
                        <input
                            value={serieNueva}
                            onChange={(e) => setSerieNueva(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarSerie(); } }}
                            list="lista-equipos-renovacion"
                            placeholder="Escriba o elija un número de serie disponible"
                            className={inputClass}
                            style={inputStyle}
                        />
                        <datalist id="lista-equipos-renovacion">
                            {disponibles.map((d) => <option key={d.idEquipo} value={d.numeroSerie}>{d.marca} {d.modelo} · {d.categoria}</option>)}
                        </datalist>
                        <Button className="flex items-center gap-1 shrink-0" onClick={agregarSerie}><Plus size={14} /> Agregar</Button>
                    </div>
                    {series.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-2">
                            {series.map((s) => (
                                <li key={s} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs" style={{ backgroundColor: COLORS.greenTint, color: COLORS.greenDark }}>
                                    {s}
                                    <button type="button" aria-label={`Quitar ${s}`} onClick={() => setSeries((l) => l.filter((x) => x !== s))}><X size={12} /></button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="sm:col-span-2">
                    <FieldLabel label="Observación">
                        <textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} rows={2} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                </div>
            </form>
        </Modal>
    );
}
