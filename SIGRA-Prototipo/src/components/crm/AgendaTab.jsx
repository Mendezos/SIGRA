import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, Eye, Plus, RotateCcw, Search } from "lucide-react";
import DataTable from "../DataTable";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as catalogos from "../../services/crmCatalogosService";
import * as api from "../../services/crmSeguimientosService";
import { fechaLocal, horaLocal, hoyISO, puedeCrearCrm } from "./helpers";
import SeguimientoDetalleModal from "./SeguimientoDetalleModal";
import SeguimientoFormModal from "./SeguimientoFormModal";
import { SeguimientoEstadoPill, SeguimientoPrioridadPill } from "./SeguimientoPills";
import SeguimientoResponsableSelect from "./SeguimientoResponsableSelect";

const DIAS_POR_DEFECTO = 7;

// Por defecto: los seguimientos abiertos del usuario (si es vendedor) desde hoy y los próximos 7 días.
function filtrosPorDefecto(user) {
    const hoy = hoyISO();
    return {
        desde: hoy,
        hasta: api.sumarDias(hoy, DIAS_POR_DEFECTO),
        prioridad: "",
        tipo: "",
        estado: "Abiertos",
        idResponsable: api.esVendedorCrm(user) ? user.idUsuario : "",
        texto: "",
    };
}

const columnas = [
    { key: "fecha", label: "Fecha", nowrap: true },
    { key: "hora", label: "Hora", nowrap: true },
    { key: "empresa", label: "Empresa", cardTitle: true },
    { key: "contacto", label: "Contacto" },
    { key: "tipo", label: "Tipo" },
    { key: "prioridad", label: "Prioridad", render: (f) => <SeguimientoPrioridadPill prioridad={f.prioridad} /> },
    {
        key: "estado",
        label: "Estado",
        render: (f) => (
            <div className="flex flex-col items-start gap-1">
                <SeguimientoEstadoPill estado={f.estado} />
                {f.estado === "Atrasado" && (
                    <span className="text-xs whitespace-nowrap" style={{ color: COLORS.red }}>{api.textoTranscurrido(f.minutosAtraso)}</span>
                )}
            </div>
        ),
    },
    { key: "motivo", label: "Motivo", render: (f) => <span className="block max-w-xs truncate" title={f.motivo}>{f.motivo}</span> },
    { key: "responsable", label: "Responsable" },
    { key: "accion", label: "", render: (f) => f.ver },
];

// CRMGPSC-016: «Mi agenda». Seguimientos ordenados por fecha y hora; los vencidos se marcan Atrasados al abrir la agenda.
// CRMGPSC-015/017/018 se hacen desde el detalle de cada seguimiento.
export default function AgendaTab({ user, target }) {
    const puedeCrear = puedeCrearCrm(user);
    const [filtros, setFiltros] = useState(() => filtrosPorDefecto(user));
    const [aplicados, setAplicados] = useState(filtros);
    const [seguimientos, setSeguimientos] = useState([]);
    const [atrasadosTotal, setAtrasadosTotal] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [buscando, setBuscando] = useState(false);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState(null);
    const [programando, setProgramando] = useState(false);
    const [detalle, setDetalle] = useState(null);
    const peticion = useRef(0);

    // Los filtros se aplican una fracción de segundo después del último cambio.
    useEffect(() => {
        const espera = setTimeout(() => setAplicados(filtros), 300);
        return () => clearTimeout(espera);
    }, [filtros]);

    const cargar = useCallback(async () => {
        const numero = ++peticion.current;
        setBuscando(true);
        try {
            const verAtrasados = aplicados.estado === "Atrasado";
            const [lista, atrasados] = await Promise.all([
                api.listarAgenda(aplicados),
                verAtrasados ? Promise.resolve(null) : api.listarAgenda({ estado: "Atrasado", idResponsable: aplicados.idResponsable }),
            ]);
            if (numero !== peticion.current) return;
            setSeguimientos(lista);
            setAtrasadosTotal((atrasados ?? lista).length);
            setError("");
        } catch (e) {
            if (numero !== peticion.current) return;
            setError(e instanceof ApiError ? e.message : "No se pudo cargar la agenda.");
        } finally {
            if (numero === peticion.current) {
                setCargando(false);
                setBuscando(false);
            }
        }
    }, [aplicados]);

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => activo && cargar());
        return () => {
            activo = false;
        };
    }, [cargar]);

    // Llegada desde una notificación: abre ese seguimiento.
    useEffect(() => {
        if (!target?.id) return undefined;
        let activo = true;
        api.obtenerSeguimiento(target.id)
            .then((s) => activo && setDetalle(s))
            .catch((e) => activo && setError(e instanceof ApiError ? e.message : "No se pudo abrir el seguimiento."));
        return () => {
            activo = false;
        };
    }, [target?.id, target?.nonce]);

    const abrir = useCallback(async (id) => {
        setError("");
        try {
            setDetalle(await api.obtenerSeguimiento(id));
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo abrir el seguimiento.");
        }
    }, []);

    const set = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }));
    const hoy = hoyISO();
    const hayCambios = JSON.stringify(filtros) !== JSON.stringify(filtrosPorDefecto(user));
    const atrasadosVisibles = seguimientos.filter((s) => s.estado === "Atrasado").length;

    const filas = useMemo(
        () =>
            seguimientos.map((s) => ({
                id: s.idSeguimiento,
                fecha: fechaLocal(s.fechaHora),
                hora: horaLocal(s.fechaHora),
                empresa: s.empresa,
                contacto: s.contacto ?? "—",
                tipo: s.tipo,
                prioridad: s.prioridad,
                estado: s.estado,
                minutosAtraso: s.minutosAtraso,
                motivo: s.motivo,
                responsable: s.responsable ?? "—",
                ver: (
                    <Button
                        className="flex items-center gap-1.5 !px-3 !py-1.5 text-xs"
                        aria-label={`Ver seguimiento ${s.codigo}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            abrir(s.idSeguimiento);
                        }}
                    >
                        <Eye size={13} /> Ver
                    </Button>
                ),
            })),
        [seguimientos, abrir]
    );

    const resumen = [
        { label: "Seguimientos en la lista", value: seguimientos.length },
        { label: "Para hoy", value: seguimientos.filter((s) => s.fechaHora.slice(0, 10) === hoy).length },
        { label: "Atrasados", value: atrasadosTotal, alerta: atrasadosTotal > 0 },
    ];

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {resumen.map((m) => (
                    <div key={m.label} className="rounded-lg p-4" style={{ backgroundColor: m.alerta ? COLORS.redTint : COLORS.greenTint }}>
                        <p className="text-xs mb-1" style={{ color: COLORS.muted }}>{m.label}</p>
                        <p className="text-2xl" style={{ color: m.alerta ? COLORS.red : COLORS.charcoal, fontWeight: 600 }}>{m.value}</p>
                    </div>
                ))}
            </div>

            {mensaje && <Notice tone={mensaje.tono}>{mensaje.texto}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            {atrasadosTotal > atrasadosVisibles && aplicados.estado !== "Atrasado" && (
                <Notice tone="warning">
                    <span className="flex flex-wrap items-center gap-3">
                        <span>
                            Hay {atrasadosTotal} seguimiento(s) atrasado(s) que no están en la lista actual.
                        </span>
                        <button
                            type="button"
                            className="underline font-medium"
                            onClick={() => setFiltros((f) => ({ ...f, estado: "Atrasado", desde: "", hasta: "" }))}
                        >
                            Ver atrasados
                        </button>
                    </span>
                </Notice>
            )}

            <div className="rounded-xl p-4 mb-4" style={{ border: `1px solid ${COLORS.border}` }}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    <FieldLabel label="Desde">
                        <input type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={set("desde")} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                    <FieldLabel label="Hasta">
                        <input type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={set("hasta")} className={inputClass} style={inputStyle} />
                    </FieldLabel>
                    <FieldLabel label="Prioridad">
                        <select value={filtros.prioridad} onChange={set("prioridad")} className={inputClass} style={inputStyle}>
                            <option value="">Todas las prioridades</option>
                            {catalogos.PRIORIDADES_SEGUIMIENTO.map((p) => <option key={p}>{p}</option>)}
                        </select>
                    </FieldLabel>
                    <FieldLabel label="Tipo de seguimiento">
                        <select value={filtros.tipo} onChange={set("tipo")} className={inputClass} style={inputStyle}>
                            <option value="">Todos los tipos</option>
                            {catalogos.TIPOS_SEGUIMIENTO.map((t) => <option key={t}>{t}</option>)}
                        </select>
                    </FieldLabel>
                    <FieldLabel label="Estado">
                        <select value={filtros.estado} onChange={set("estado")} className={inputClass} style={inputStyle}>
                            {api.ESTADOS_FILTRO_AGENDA.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                        </select>
                    </FieldLabel>
                    <SeguimientoResponsableSelect
                        label="Responsable"
                        todos="Todos los responsables"
                        value={filtros.idResponsable}
                        onChange={(v) => setFiltros((f) => ({ ...f, idResponsable: v }))}
                    />
                    <div className="md:col-span-2">
                        <FieldLabel label="Buscar">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color={COLORS.muted} />
                                <input
                                    value={filtros.texto}
                                    onChange={set("texto")}
                                    placeholder="Empresa, contacto o motivo..."
                                    className={inputClass}
                                    style={{ ...inputStyle, paddingLeft: "2.1rem" }}
                                />
                            </div>
                        </FieldLabel>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-4">
                    <Button className="flex items-center gap-1.5" onClick={() => setFiltros((f) => ({ ...f, desde: hoy, hasta: hoy, estado: f.estado === "Atrasado" ? "Abiertos" : f.estado }))}>
                        <CalendarDays size={14} /> Hoy
                    </Button>
                    <Button onClick={() => setFiltros((f) => ({ ...f, desde: hoy, hasta: api.sumarDias(hoy, DIAS_POR_DEFECTO), estado: f.estado === "Atrasado" ? "Abiertos" : f.estado }))}>
                        Próximos {DIAS_POR_DEFECTO} días
                    </Button>
                    <Button className="flex items-center gap-1.5" onClick={() => setFiltros((f) => ({ ...f, estado: "Atrasado", desde: "", hasta: "" }))}>
                        <AlertTriangle size={14} /> Ver atrasados
                    </Button>
                    {hayCambios && (
                        <Button variant="ghost" className="flex items-center gap-1.5" onClick={() => setFiltros(filtrosPorDefecto(user))}>
                            <RotateCcw size={14} /> Restablecer filtros
                        </Button>
                    )}
                    {puedeCrear && (
                        <Button variant="primary" className="flex items-center gap-1.5 ml-auto" onClick={() => { setMensaje(null); setProgramando(true); }}>
                            <Plus size={15} /> Programar seguimiento
                        </Button>
                    )}
                </div>
            </div>

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando agenda...</p>
            ) : (
                <DataTable
                    layout="table"
                    columns={columnas}
                    rows={filas}
                    onRowClick={(fila) => abrir(fila.id)}
                    showSearch={false}
                    showEstadoFilter={false}
                    hideInactiveToggle
                    loading={buscando}
                    emptyMessage={api.MENSAJE_SIN_SEGUIMIENTOS}
                />
            )}

            {programando && (
                <SeguimientoFormModal
                    user={user}
                    onClose={() => setProgramando(false)}
                    onSaved={(creado) => {
                        setProgramando(false);
                        setMensaje({
                            tono: "success",
                            texto: `El seguimiento ${creado.codigo} se programó para el ${fechaLocal(creado.fechaHora)} a las ${horaLocal(creado.fechaHora)} (${creado.empresa}). Quedó Pendiente y asignado a ${creado.responsable}.`,
                        });
                        cargar();
                    }}
                />
            )}

            {detalle && (
                <SeguimientoDetalleModal
                    key={`${detalle.idSeguimiento}-${detalle.estado}-${detalle.fechaHora}`}
                    seguimiento={detalle}
                    user={user}
                    onClose={() => setDetalle(null)}
                    onChanged={(resultado) => {
                        setDetalle(null);
                        setMensaje({ tono: resultado.aplicado ? "success" : "warning", texto: resultado.mensaje });
                        cargar();
                    }}
                />
            )}
        </div>
    );
}
