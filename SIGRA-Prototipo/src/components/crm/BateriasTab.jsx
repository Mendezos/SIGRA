import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import DataTable from "../DataTable";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as catalogos from "../../services/crmCatalogosService";
import * as api from "../../services/crmRecordatoriosService";
import BateriaAtencionModal from "./BateriaAtencionModal";
import BateriaDetalleModal from "./BateriaDetalleModal";
import { BateriaEstado, BateriaVencimiento } from "./BateriaEstado";
import BateriaFormModal from "./BateriaFormModal";
import { fechaLocal, puedeCrearCrm } from "./helpers";

const FILTROS_VACIOS = { estado: "", idVendedor: "", cliente: "", desde: "", hasta: "" };
const hayCriterios = (f) => Object.values(f).some((v) => String(v).trim() !== "");
const MENSAJE_RANGO = "La fecha inicial no puede ser posterior a la fecha final.";

const columnas = [
    { key: "codigo", label: "Recordatorio", cardTitle: true },
    { key: "cliente", label: "Cliente" },
    { key: "contacto", label: "Contacto" },
    { key: "bateria", label: "Batería" },
    { key: "cantidad", label: "Cantidad" },
    { key: "compra", label: "Fecha de compra" },
    { key: "factura", label: "Factura" },
    {
        key: "recordatorio",
        label: "Fecha de recordatorio",
        render: (f) => (
            <span>
                {f.recordatorio}
                <BateriaVencimiento recordatorio={f.origen} />
            </span>
        ),
    },
    { key: "estado", label: "Estado", render: (f) => <BateriaEstado estado={f.estado} /> },
    { key: "vendedor", label: "Vendedor" },
];

// Recordatorios de baterías (CRMGPSC-025): compras de baterías con el aviso de reemplazo a los 11 meses.
export default function BateriasTab({ user, target }) {
    const puedeCrear = puedeCrearCrm(user);
    const [todos, setTodos] = useState([]);
    const [lista, setLista] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [filtros, setFiltros] = useState(FILTROS_VACIOS);
    const [aplicados, setAplicados] = useState(FILTROS_VACIOS);
    const [cargando, setCargando] = useState(true);
    const [buscando, setBuscando] = useState(false);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [registrando, setRegistrando] = useState(false);
    const [detalle, setDetalle] = useState(null);
    const [atendiendo, setAtendiendo] = useState(null);

    const hayFiltros = hayCriterios(aplicados);
    const rangoInvalido = Boolean(filtros.desde && filtros.hasta && filtros.desde > filtros.hasta);

    // Los criterios se aplican una fracción de segundo después de dejar de escribir.
    useEffect(() => {
        const espera = setTimeout(() => setAplicados(filtros), 350);
        return () => clearTimeout(espera);
    }, [filtros]);

    useEffect(() => {
        let activo = true;
        catalogos
            .listarVendedores()
            .then((v) => activo && setVendedores(v))
            .catch(() => activo && setVendedores([]));
        return () => {
            activo = false;
        };
    }, []);

    // "todos" alimenta las tarjetas de resumen; "lista" es lo que muestra la tabla con los filtros aplicados.
    const cargar = useCallback(async () => {
        setBuscando(true);
        try {
            const invalido = Boolean(aplicados.desde && aplicados.hasta && aplicados.desde > aplicados.hasta);
            const completa = await api.listarBaterias();
            setTodos(completa);
            if (invalido) {
                setLista([]);
                setError(MENSAJE_RANGO);
            } else {
                setLista(hayFiltros ? await api.listarBaterias(aplicados) : completa);
                setError("");
            }
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudieron cargar los recordatorios de baterías.");
        } finally {
            setCargando(false);
            setBuscando(false);
        }
    }, [aplicados, hayFiltros]);

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => activo && cargar());
        return () => {
            activo = false;
        };
    }, [cargar]);

    // Llegada desde una notificación de la campana: abre ese recordatorio.
    useEffect(() => {
        if (!target?.id) return undefined;
        let activo = true;
        api.obtenerBateria(target.id)
            .then((r) => activo && setDetalle(r))
            .catch((e) => activo && setError(e instanceof ApiError ? e.message : "No se pudo abrir el recordatorio."));
        return () => {
            activo = false;
        };
    }, [target?.id, target?.nonce]);

    const filas = useMemo(
        () =>
            lista.map((r) => ({
                id: r.idRecordatorio,
                codigo: r.codigo,
                cliente: r.cliente,
                contacto: r.contacto || "—",
                bateria: r.modeloBateria,
                cantidad: r.cantidad,
                compra: fechaLocal(r.fechaCompra),
                factura: r.numeroFactura || "—",
                recordatorio: fechaLocal(r.fechaRecordatorio),
                estado: r.estado,
                vendedor: r.vendedor,
                origen: r,
            })),
        [lista]
    );

    const resumen = useMemo(
        () => [
            { label: "Por atender hoy", value: todos.filter((r) => api.estaAbierto(r.estado) && r.diasRestantes === 0).length },
            { label: "Vencidos sin atender", value: todos.filter((r) => api.estaAbierto(r.estado) && r.diasRestantes < 0).length },
            { label: "Próximos (pendientes)", value: todos.filter((r) => api.estaAbierto(r.estado) && r.diasRestantes > 0).length },
            { label: "Atendidos", value: todos.filter((r) => r.estado === "Atendido").length },
        ],
        [todos]
    );

    const set = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }));

    function limpiar() {
        setFiltros(FILTROS_VACIOS);
        setAplicados(FILTROS_VACIOS);
    }

    return (
        <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {resumen.map((m) => (
                    <div key={m.label} className="rounded-lg p-4" style={{ backgroundColor: COLORS.greenTint }}>
                        <p className="text-xs mb-1" style={{ color: COLORS.muted }}>{m.label}</p>
                        <p className="text-2xl" style={{ color: COLORS.charcoal, fontWeight: 600 }}>{m.value}</p>
                    </div>
                ))}
            </div>

            {mensaje && <Notice>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            {puedeCrear && (
                <div className="flex justify-end mb-4">
                    <Button variant="primary" className="flex items-center gap-1.5" onClick={() => { setMensaje(""); setRegistrando(true); }}>
                        <Plus size={15} /> Registrar compra de batería
                    </Button>
                </div>
            )}

            <div className="rounded-xl p-4 mb-4" style={{ border: `1px solid ${COLORS.border}` }}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                    <FieldLabel label="Cliente">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color={COLORS.muted} />
                            <input value={filtros.cliente} onChange={set("cliente")} placeholder="Empresa" className={inputClass} style={{ ...inputStyle, paddingLeft: "2.1rem" }} />
                        </div>
                    </FieldLabel>
                    <FieldLabel label="Estado">
                        <select value={filtros.estado} onChange={set("estado")} className={inputClass} style={inputStyle}>
                            <option value="">Todos los estados</option>
                            {api.ESTADOS_BATERIA.map((e) => <option key={e}>{e}</option>)}
                        </select>
                    </FieldLabel>
                    <FieldLabel label="Vendedor">
                        <select value={filtros.idVendedor} onChange={set("idVendedor")} className={inputClass} style={inputStyle}>
                            <option value="">Todos</option>
                            {vendedores.map((v) => <option key={v.idUsuario} value={v.idUsuario}>{v.nombre}</option>)}
                        </select>
                    </FieldLabel>
                    <FieldLabel label="Recordatorio desde">
                        <input type="date" value={filtros.desde} onChange={set("desde")} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                    <FieldLabel label="Recordatorio hasta">
                        <input type="date" value={filtros.hasta} onChange={set("hasta")} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                </div>
                {rangoInvalido && (
                    <p role="alert" className="text-xs mt-2" style={{ color: COLORS.red }}>{MENSAJE_RANGO}</p>
                )}
                {hayFiltros && (
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                        <p className="text-sm" style={{ color: COLORS.charcoal }} aria-live="polite">
                            <strong>{lista.length}</strong> recordatorio(s) encontrado(s)
                        </p>
                        <Button className="ml-auto flex items-center gap-1.5" onClick={limpiar}>
                            <X size={14} /> Limpiar filtros
                        </Button>
                    </div>
                )}
            </div>

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando recordatorios...</p>
            ) : (
                <DataTable
                    layout="table"
                    compact
                    columns={columnas}
                    rows={filas}
                    onRowClick={(fila) => setDetalle(fila.origen)}
                    showSearch={false}
                    showEstadoFilter={false}
                    loading={buscando}
                    hideInactiveToggle
                    paginationResetKey={JSON.stringify(aplicados)}
                    emptyMessage={hayFiltros ? api.MENSAJE_SIN_RESULTADOS : api.MENSAJE_SIN_RECORDATORIOS}
                />
            )}

            {registrando && (
                <BateriaFormModal
                    onClose={() => setRegistrando(false)}
                    onSaved={async (resultado) => {
                        setRegistrando(false);
                        setMensaje(resultado.mensaje);
                        await cargar();
                        setDetalle(resultado.recordatorio);
                    }}
                />
            )}

            {atendiendo && (
                <BateriaAtencionModal
                    recordatorio={atendiendo}
                    onClose={() => { setDetalle(atendiendo); setAtendiendo(null); }}
                    onSaved={async (resultado) => {
                        setAtendiendo(null);
                        setMensaje(resultado.mensaje);
                        await cargar();
                        setDetalle(resultado.recordatorio);
                    }}
                />
            )}

            {detalle && (
                <BateriaDetalleModal
                    recordatorio={detalle}
                    puedeAtender={puedeCrear}
                    onAtender={() => { setAtendiendo(detalle); setDetalle(null); }}
                    onClose={() => setDetalle(null)}
                />
            )}
        </div>
    );
}
