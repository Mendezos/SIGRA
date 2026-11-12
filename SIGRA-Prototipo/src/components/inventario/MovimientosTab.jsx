import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import DataTable from "../DataTable";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/inventarioService";
import { fechaHora } from "./helpers";

const columnas = [
    { key: "fecha", label: "Fecha" },
    { key: "serie", label: "Equipo" },
    { key: "categoria", label: "Tipo de artículo" },
    { key: "tipo", label: "Movimiento" },
    { key: "sentido", label: "Sentido" },
    { key: "cambio", label: "Cambio de estado" },
    { key: "cantidad", label: "Cantidad" },
    { key: "usuario", label: "Usuario" },
    { key: "observacion", label: "Observación" },
];

function MovimientoModal({ modo, equipos, onClose, onSaved }) {
    const esEntrada = modo === "entrada";
    const tipos = esEntrada ? api.TIPOS_ENTRADA : ["Pérdida"];

    const [idEquipo, setIdEquipo] = useState("");
    const [idCategoria, setIdCategoria] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [tipo, setTipo] = useState(esEntrada ? "" : "Pérdida");
    const [cantidad, setCantidad] = useState("1");
    const [observacion, setObservacion] = useState("");
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    const equipo = equipos.find((e) => String(e.idEquipo) === idEquipo);

    // Tipos de artículo que existen en el inventario (radio, repetidora, accesorio, batería, repuesto...)
    const categorias = useMemo(
        () => [...new Map(equipos.map((e) => [e.idCategoria, e.categoria])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
        [equipos]
    );
    const opciones = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        return equipos.filter((e) =>
            (!idCategoria || String(e.idCategoria) === idCategoria) &&
            (!texto || `${e.numeroSerie} ${e.marca} ${e.modelo}`.toLowerCase().includes(texto))
        );
    }, [equipos, idCategoria, busqueda]);
    const porCantidad = equipo?.manejaCantidad;
    const pedirCantidad = porCantidad && (tipo === "Compra" || !esEntrada);

    async function guardar(e) {
        e.preventDefault();
        setError("");
        setGuardando(true);
        const datos = {
            idEquipo: idEquipo ? Number(idEquipo) : null,
            tipoMovimiento: tipo || null,
            cantidad: pedirCantidad ? Number(cantidad) : null,
            observacion: observacion || null,
        };
        try {
            if (esEntrada) await api.registrarEntrada(datos);
            else await api.registrarSalida(datos);
            onSaved(esEntrada ? "La entrada se registró correctamente." : "La salida se registró correctamente.");
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo registrar el movimiento.");
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={esEntrada ? "Registrar entrada de inventario" : "Registrar salida de inventario"}
            subtitle={esEntrada
                ? "Compra, devolución de cliente o equipo reparado."
                : "Salida por pérdida o extravío del equipo."}
            width="max-w-xl"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-movimiento" disabled={guardando}>
                        {guardando ? "Guardando..." : "Registrar"}
                    </Button>
                </div>
            }
        >
            {error && <Notice tone="error">{error}</Notice>}

            <form id="form-movimiento" onSubmit={guardar} className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldLabel label="Tipo de artículo">
                        <select
                            value={idCategoria}
                            onChange={(e) => { setIdCategoria(e.target.value); setIdEquipo(""); }}
                            className={inputClass}
                            style={inputStyle}
                        >
                            <option value="">Todos los tipos</option>
                            {categorias.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                        </select>
                    </FieldLabel>
                    <FieldLabel label="Buscar por serie o modelo">
                        <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setIdEquipo(""); }} placeholder="Ej. LT-ANT o Kenwood" className={inputClass} style={inputStyle} />
                    </FieldLabel>
                </div>

                <FieldLabel label={`Equipo * (${opciones.length} disponible${opciones.length === 1 ? "" : "s"} en la lista)`}>
                    <select value={idEquipo} onChange={(e) => setIdEquipo(e.target.value)} className={inputClass} style={inputStyle}>
                        <option value="">Seleccionar...</option>
                        {opciones.map((e) => (
                            <option key={e.idEquipo} value={e.idEquipo}>
                                {e.numeroSerie} · {e.marca} {e.modelo} · {e.categoria} ({e.estado})
                            </option>
                        ))}
                    </select>
                </FieldLabel>

                <FieldLabel label="Tipo de movimiento *">
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputClass} style={inputStyle}>
                        {esEntrada && <option value="">Seleccionar...</option>}
                        {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </FieldLabel>

                {pedirCantidad && (
                    <FieldLabel label={`Cantidad (disponible en stock: ${equipo.cantidad})`}>
                        <input type="number" min="1" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                )}

                <FieldLabel label={esEntrada ? "Observación" : "Circunstancias reportadas *"}>
                    <textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} rows={3} className={inputClass} style={inputStyle} />
                </FieldLabel>
            </form>
        </Modal>
    );
}

export default function MovimientosTab({ canWrite, onChanged }) {
    const [movimientos, setMovimientos] = useState([]);
    const [equipos, setEquipos] = useState([]);
    const [tipoFiltro, setTipoFiltro] = useState("");
    const [categoriaFiltro, setCategoriaFiltro] = useState("");
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [modal, setModal] = useState(null);

    const cargar = useCallback(async () => {
        try {
            const [movs, lista] = await Promise.all([api.listarMovimientos(), api.listarEquipos()]);
            setMovimientos(movs);
            setEquipos(lista);
            setError("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudieron cargar los movimientos.");
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => activo && cargar());
        return () => {
            activo = false;
        };
    }, [cargar]);

    // Las categorías por cantidad se consultan una sola vez para saber qué equipos piden cantidad.
    const [categoriasCantidad, setCategoriasCantidad] = useState(new Set());
    useEffect(() => {
        let activo = true;
        api.listarCategorias()
            .then((cats) => activo && setCategoriasCantidad(new Set(cats.filter((c) => c.manejaCantidad).map((c) => c.idCategoria))))
            .catch(() => {});
        return () => {
            activo = false;
        };
    }, []);

    const equiposConCantidad = useMemo(
        () => equipos.map((e) => ({ ...e, manejaCantidad: categoriasCantidad.has(e.idCategoria) })),
        [equipos, categoriasCantidad]
    );

    const tipos = useMemo(() => [...new Set(movimientos.map((m) => m.tipoMovimiento))], [movimientos]);
    const categoriaDe = useMemo(() => Object.fromEntries(equipos.map((e) => [e.numeroSerie, e.categoria])), [equipos]);
    const categoriasLista = useMemo(() => [...new Set(equipos.map((e) => e.categoria))].sort((a, b) => a.localeCompare(b)), [equipos]);

    const filas = useMemo(
        () =>
            movimientos
                .filter((m) => !tipoFiltro || m.tipoMovimiento === tipoFiltro)
                .filter((m) => !categoriaFiltro || categoriaDe[m.numeroSerie] === categoriaFiltro)
                .map((m) => ({
                    id: m.idMovimiento,
                    fecha: fechaHora(m.fecha),
                    serie: `${m.numeroSerie} · ${m.modelo}`,
                    categoria: categoriaDe[m.numeroSerie] ?? "—",
                    tipo: m.tipoMovimiento,
                    sentido: m.sentido,
                    cambio: m.estadoAnterior && m.estadoAnterior !== m.estadoNuevo ? `${m.estadoAnterior} → ${m.estadoNuevo}` : m.estadoNuevo,
                    cantidad: m.cantidad,
                    usuario: m.usuario,
                    observacion: m.observacion,
                })),
        [movimientos, tipoFiltro, categoriaFiltro, categoriaDe]
    );

    function alGuardar(texto) {
        setModal(null);
        setMensaje(texto);
        cargar();
        onChanged?.();
    }

    return (
        <div>
            {mensaje && <Notice>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <select
                    value={tipoFiltro}
                    onChange={(e) => setTipoFiltro(e.target.value)}
                    aria-label="Filtrar por tipo de movimiento"
                    className="px-3 py-2.5 rounded-lg text-sm bg-white"
                    style={{ ...inputStyle, color: tipoFiltro ? COLORS.charcoal : COLORS.muted }}
                >
                    <option value="">Todos los movimientos</option>
                    {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>

                <select
                    value={categoriaFiltro}
                    onChange={(e) => setCategoriaFiltro(e.target.value)}
                    aria-label="Filtrar por tipo de artículo"
                    className="px-3 py-2.5 rounded-lg text-sm bg-white"
                    style={{ ...inputStyle, color: categoriaFiltro ? COLORS.charcoal : COLORS.muted }}
                >
                    <option value="">Todos los tipos de artículo</option>
                    {categoriasLista.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                {canWrite && (
                    <div className="flex gap-2 ml-auto">
                        <Button variant="primary" className="flex items-center gap-1.5" onClick={() => { setMensaje(""); setModal("entrada"); }}>
                            <ArrowDownToLine size={15} /> Registrar entrada
                        </Button>
                        <Button className="flex items-center gap-1.5" onClick={() => { setMensaje(""); setModal("salida"); }}>
                            <ArrowUpFromLine size={15} /> Registrar salida
                        </Button>
                    </div>
                )}
            </div>

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando movimientos...</p>
            ) : (
                <DataTable layout="table" columns={columnas} rows={filas} searchPlaceholder="Buscar movimiento..." hideInactiveToggle />
            )}

            {modal && (
                <MovimientoModal
                    key={modal}
                    modo={modal}
                    equipos={equiposConCantidad}
                    onClose={() => setModal(null)}
                    onSaved={alGuardar}
                />
            )}
        </div>
    );
}
