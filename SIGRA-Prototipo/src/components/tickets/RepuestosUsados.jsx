import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import * as api from "../../services/ticketsService";
import { fecha, mensajeError } from "./helpers";

/**
 * Repuestos que se usaron en la reparación de una boleta.
 * Con `editable` el técnico asignado elige el repuesto de bodega y la cantidad: se descuenta del inventario al
 * agregarlo y regresa si se quita. Sin `editable` solo se muestra la lista.
 */
export default function RepuestosUsados({ boleta, editable = false }) {
    const [usados, setUsados] = useState([]);
    const [disponibles, setDisponibles] = useState([]);
    const [idRepuesto, setIdRepuesto] = useState("");
    const [cantidad, setCantidad] = useState(1);
    const [cargando, setCargando] = useState(true);
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let activo = true;
        Promise.all([api.repuestosUsados(boleta.idTicket), editable ? api.repuestosDisponibles() : Promise.resolve([])])
            .then(([lista, catalogo]) => {
                if (!activo) return;
                setUsados(lista);
                setDisponibles(catalogo);
            })
            .catch((e) => activo && setError(mensajeError(e)))
            .finally(() => activo && setCargando(false));
        return () => { activo = false; };
    }, [boleta.idTicket, editable]);

    // Primero los repuestos del modelo del equipo que se está reparando.
    const opciones = useMemo(() => {
        const modelos = new Set(boleta.equipos.map((e) => `${e.marca} ${e.modelo}`.trim().toLowerCase()));
        const propios = (r) => modelos.has(r.modelo.trim().toLowerCase());
        return [...disponibles].sort((a, b) => Number(propios(b)) - Number(propios(a)) || a.modelo.localeCompare(b.modelo) || a.nombre.localeCompare(b.nombre))
            .map((r) => ({ ...r, delModelo: propios(r) }));
    }, [disponibles, boleta.equipos]);

    const elegido = opciones.find((r) => String(r.id) === idRepuesto);

    async function refrescarCatalogo() {
        try { setDisponibles(await api.repuestosDisponibles()); } catch { /* el catálogo se actualiza en el próximo intento */ }
    }

    async function agregar() {
        if (!elegido) return;
        setOcupado(true); setError("");
        try {
            setUsados(await api.usarRepuesto(boleta.idTicket, { idRepuesto: elegido.id, cantidad: Number(cantidad) }));
            setIdRepuesto(""); setCantidad(1);
            await refrescarCatalogo();
        } catch (e) { setError(mensajeError(e)); }
        finally { setOcupado(false); }
    }

    async function quitar(idTicketRepuesto) {
        setOcupado(true); setError("");
        try {
            setUsados(await api.devolverRepuesto(boleta.idTicket, idTicketRepuesto));
            await refrescarCatalogo();
        } catch (e) { setError(mensajeError(e)); }
        finally { setOcupado(false); }
    }

    return (
        <section className="rounded-xl p-4 space-y-3" style={{ border: `1px solid ${COLORS.border}` }}>
            <h3 className="text-xs uppercase tracking-wide" style={{ color: COLORS.muted, fontWeight: 600 }}>Repuestos utilizados</h3>
            {error && <Notice tone="error">{error}</Notice>}

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando...</p>
            ) : usados.length === 0 ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>No se han registrado repuestos en esta boleta.</p>
            ) : (
                <ul className="divide-y" style={{ borderColor: COLORS.border }}>
                    {usados.map((u) => (
                        <li key={u.idTicketRepuesto} className="flex items-center justify-between gap-3 py-2 text-sm">
                            <span>
                                <strong>{u.cantidad} ×</strong> {u.nombre}
                                <span style={{ color: COLORS.muted }}> · {u.modelo} · {u.usuario} · {fecha(u.fecha)}</span>
                            </span>
                            {editable && (
                                <button type="button" disabled={ocupado} onClick={() => quitar(u.idTicketRepuesto)} aria-label={`Quitar ${u.nombre}`} title="Quitar y devolver a bodega" className="p-1.5 rounded-lg hover:bg-red-50" style={{ color: COLORS.red }}>
                                    <Trash2 size={15} />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {editable && !cargando && (
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select value={idRepuesto} onChange={(e) => setIdRepuesto(e.target.value)} aria-label="Repuesto de bodega" className={inputClass} style={{ ...inputStyle, flex: "1 1 16rem" }}>
                            <option value="">{opciones.length === 0 ? "No hay repuestos en bodega" : "Seleccione el repuesto usado..."}</option>
                            {opciones.map((r) => (
                                <option key={r.id} value={r.id}>{r.nombre} · {r.modelo}{r.delModelo ? " (mismo modelo)" : ""} · {r.cantidad} en bodega</option>
                            ))}
                        </select>
                        <input type="number" min="1" max={elegido?.cantidad ?? 1000} value={cantidad} onChange={(e) => setCantidad(e.target.value)} aria-label="Cantidad usada" className={inputClass} style={{ ...inputStyle, width: "5.5rem" }} />
                        <Button className="flex items-center gap-1 shrink-0" disabled={!elegido || ocupado || Number(cantidad) < 1} onClick={agregar}>
                            <Plus size={14} /> Agregar
                        </Button>
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: COLORS.muted }}>Al agregar un repuesto, el inventario lo descuenta de la bodega. Si se quita, regresa.</p>
                </div>
            )}
        </section>
    );
}
