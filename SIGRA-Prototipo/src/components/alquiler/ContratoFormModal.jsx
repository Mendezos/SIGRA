import { useEffect, useState } from "react";
import { X, FileText } from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alquilerService";
import { listarArticulos } from "../../services/inventarioService";
import AccesoriosPicker from "./AccesoriosPicker";
import SelectorEquipo from "./SelectorEquipo";
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
    const [series, setSeries] = useState([]);
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

    // La lista desplegable solo ofrece equipos disponibles del inventario (INVE-006).
    function agregarSerie(serie) {
        if (!serie || series.some((s) => s.toLowerCase() === serie.toLowerCase())) return;
        setError("");
        setSeries((lista) => [...lista, serie]);
    }

    function detalleSerie(serie) {
        const e = disponibles.find((d) => d.numeroSerie.toLowerCase() === serie.toLowerCase());
        return e ? `${e.marca} ${e.modelo} · ${e.categoria}` : "No figura entre los equipos disponibles";
    }

    async function guardar(e) {
        e.preventDefault();
        setError("");
        setErrores([]);

        setGuardando(true);
        try {
            const detalle = await api.registrarContrato({
                empresa,
                fechaInicio: fechaInicio || null,
                fechaVencimiento: fechaVencimiento || null,
                montoMensual: monto === "" ? null : Number(monto),
                condiciones: condiciones || null,
                cubreReparaciones,
                series,
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
                        Equipos del contrato *
                    </span>
                    <SelectorEquipo disponibles={disponibles} excluidas={series} onAgregar={agregarSerie} />

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
