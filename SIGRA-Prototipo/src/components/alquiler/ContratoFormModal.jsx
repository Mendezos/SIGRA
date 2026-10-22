import { useEffect, useState } from "react";
import { Plus, X, FileText } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import { listarArticulos, obtenerFichaPorSerie } from "../../services/inventarioService";
import AccesoriosPicker from "./AccesoriosPicker";
import { aItemsApi, hoyISO } from "./helpers";

export default function ContratoFormModal({ onClose, onSaved }) {
    const [clientes, setClientes] = useState([]);
    const [disponibles, setDisponibles] = useState([]);
    const [empresa, setEmpresa] = useState("");
    const [fechaInicio, setFechaInicio] = useState(hoyISO());
    const [fechaVencimiento, setFechaVencimiento] = useState("");
    const [monto, setMonto] = useState("");
    const [condiciones, setCondiciones] = useState("");
    const [cubreReparaciones, setCubreReparaciones] = useState(false);
    const [catalogoAccesorios, setCatalogoAccesorios] = useState([]);
    const [accesorios, setAccesorios] = useState([]);
    const [validandoSerie, setValidandoSerie] = useState(false);
    const [series, setSeries] = useState([]);
    const [serieNueva, setSerieNueva] = useState("");
    const [error, setError] = useState("");
    const [errores, setErrores] = useState([]);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        let activo = true;
        Promise.all([api.listarClientes(), api.listarEquiposDisponibles(), listarArticulos("accesorios")])
            .then(([cl, eq, acc]) => {
                if (!activo) return;
                setClientes(cl);
                setDisponibles(eq);
                setCatalogoAccesorios(acc);
            })
            .catch((e) => activo && setError(e.message ?? "No se pudieron cargar los catálogos."));
        return () => {
            activo = false;
        };
    }, []);

    // Valida contra el inventario antes de agregar el equipo a la lista (INVE-006)
    async function agregarSerie() {
        const serie = serieNueva.trim();
        if (!serie) return;
        if (series.some((s) => s.toLowerCase() === serie.toLowerCase())) {
            setError("Ese número de serie ya está en la lista del contrato.");
            return;
        }

        setError("");
        setValidandoSerie(true);
        try {
            const ficha = await obtenerFichaPorSerie(serie);
            if (ficha.equipo.estado !== "Disponible") {
                setError(`Este equipo no está disponible actualmente. Estado actual: ${ficha.equipo.estado}.`);
                return;
            }
            if (ficha.equipo.manejaCantidad) {
                setError("Este artículo se maneja por cantidad; agréguelo en la sección de accesorios.");
                return;
            }
            setSeries((lista) => [...lista, ficha.equipo.numeroSerie]);
            setSerieNueva("");
        } catch {
            setError("El número de serie ingresado no existe en el inventario.");
        } finally {
            setValidandoSerie(false);
        }
    }

    function detalleSerie(serie) {
        const e = disponibles.find((d) => d.numeroSerie.toLowerCase() === serie.toLowerCase());
        return e ? `${e.marca} ${e.modelo} · ${e.categoria}` : "No figura entre los equipos disponibles";
    }

    async function guardar(e) {
        e.preventDefault();
        setError("");
        setErrores([]);

        // Si quedó una serie escrita sin agregar, se incluye en el contrato.
        const todas = serieNueva.trim() ? [...series, serieNueva.trim()] : series;

        setGuardando(true);
        try {
            const detalle = await api.registrarContrato({
                empresa,
                fechaInicio: fechaInicio || null,
                fechaVencimiento: fechaVencimiento || null,
                montoMensual: monto === "" ? null : Number(monto),
                condiciones: condiciones || null,
                cubreReparaciones,
                series: todas,
                accesorios: aItemsApi(accesorios),
            });
            onSaved(detalle);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo registrar el contrato.");
            setErrores(err.errores ?? []);
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            icon={FileText}
            title="Registrar contrato de alquiler"
            subtitle="Los equipos seleccionados pasan a estado Alquilado en el inventario."
            width="max-w-3xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-contrato" disabled={guardando}>
                        {guardando ? "Guardando..." : "Registrar contrato"}
                    </Button>
                </div>
            }
        >
            {error && (
                <Notice tone="error">
                    {error}
                    {errores.length > 0 && (
                        <ul className="list-disc ml-4 mt-1">{errores.map((x) => <li key={x}>{x}</li>)}</ul>
                    )}
                </Notice>
            )}

            <form id="form-contrato" onSubmit={guardar} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                    <FieldLabel label="Empresa cliente *">
                        <input
                            value={empresa}
                            onChange={(e) => setEmpresa(e.target.value)}
                            list="lista-clientes"
                            maxLength={150}
                            className={inputClass}
                            style={inputStyle}
                        />
                        <datalist id="lista-clientes">
                            {clientes.map((c) => <option key={c.idCliente} value={c.empresa} />)}
                        </datalist>
                    </FieldLabel>
                </div>

                <FieldLabel label="Fecha de inicio *">
                    <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={inputClass} style={inputStyle} />
                </FieldLabel>
                <FieldLabel label="Fecha de vencimiento *">
                    <input type="date" value={fechaVencimiento} min={fechaInicio} onChange={(e) => setFechaVencimiento(e.target.value)} className={inputClass} style={inputStyle} />
                </FieldLabel>

                <FieldLabel label="Monto mensual (₡) *">
                    <input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className={inputClass} style={inputStyle} />
                </FieldLabel>

                <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={cubreReparaciones} onChange={e => setCubreReparaciones(e.target.checked)} />Incluye cobertura de reparaciones de los equipos</label>
                    <FieldLabel label="Condiciones del contrato">
                        <textarea value={condiciones} onChange={(e) => setCondiciones(e.target.value)} rows={2} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                </div>

                <div className="sm:col-span-2">
                    <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>
                        Equipos del contrato (número de serie) *
                    </span>
                    <div className="flex gap-2">
                        <input
                            value={serieNueva}
                            onChange={(e) => setSerieNueva(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarSerie(); } }}
                            list="lista-equipos-disponibles"
                            placeholder="Escriba o elija un número de serie disponible"
                            className={inputClass}
                            style={inputStyle}
                        />
                        <datalist id="lista-equipos-disponibles">
                            {disponibles.map((d) => (
                                <option key={d.idEquipo} value={d.numeroSerie}>{d.marca} {d.modelo} · {d.categoria}</option>
                            ))}
                        </datalist>
                        <Button className="flex items-center gap-1 shrink-0" disabled={validandoSerie} onClick={agregarSerie}>
                            <Plus size={14} /> Agregar
                        </Button>
                    </div>

                    {series.length > 0 && (
                        <ul className="mt-3 flex flex-col gap-2">
                            {series.map((s) => (
                                <li key={s} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm" style={{ border: `1px solid ${COLORS.border}` }}>
                                    <span>
                                        <span style={{ fontWeight: 600, color: COLORS.charcoal }}>{s}</span>
                                        <span className="ml-2 text-xs" style={{ color: COLORS.muted }}>{detalleSerie(s)}</span>
                                    </span>
                                    <button type="button" aria-label={`Quitar ${s}`} onClick={() => setSeries((l) => l.filter((x) => x !== s))} style={{ color: COLORS.red }}>
                                        <X size={14} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="sm:col-span-2">
                    <span className="block text-xs mb-1.5" style={{ color: COLORS.charcoal }}>
                        Accesorios entregados (opcional)
                    </span>
                    <AccesoriosPicker catalogo={catalogoAccesorios} value={accesorios} onChange={setAccesorios} />
                </div>
            </form>
        </Modal>
    );
}
