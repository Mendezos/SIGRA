import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, Plus, RotateCcw, Search } from "lucide-react";
import DataTable from "../DataTable";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/crmSeguimientosService";
import { fechaHoraLocal, puedeCrearCrm } from "./helpers";
import SerieDetalleModal from "./SerieDetalleModal";
import SerieFormModal from "./SerieFormModal";
import { SeguimientoEstadoPill } from "./SeguimientoPills";
import SeguimientoResponsableSelect from "./SeguimientoResponsableSelect";

const FILTROS_INICIALES = { estado: "Activa", idResponsable: "", texto: "" };

const columnas = [
    { key: "codigo", label: "Serie", nowrap: true },
    { key: "empresa", label: "Empresa", cardTitle: true },
    { key: "contacto", label: "Contacto" },
    { key: "periodicidad", label: "Periodicidad" },
    { key: "tipo", label: "Tipo" },
    { key: "proxima", label: "Próxima fecha", nowrap: true },
    { key: "avance", label: "Avance", nowrap: true },
    { key: "responsable", label: "Responsable" },
    { key: "estado", label: "Estado", render: (f) => <SeguimientoEstadoPill estado={f.estado} /> },
    { key: "accion", label: "", render: (f) => f.ver },
];

// CRMGPSC-024: contactos periódicos. Cada serie genera un seguimiento por fecha; se cancela completa o seguimiento por seguimiento.
export default function PeriodicosTab({ user, target }) {
    const puedeCrear = puedeCrearCrm(user);
    const [filtros, setFiltros] = useState(FILTROS_INICIALES);
    const [aplicados, setAplicados] = useState(FILTROS_INICIALES);
    const [series, setSeries] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [buscando, setBuscando] = useState(false);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState(null);
    const [creando, setCreando] = useState(false);
    const [detalle, setDetalle] = useState(null);
    const peticion = useRef(0);

    useEffect(() => {
        const espera = setTimeout(() => setAplicados(filtros), 300);
        return () => clearTimeout(espera);
    }, [filtros]);

    const cargar = useCallback(async () => {
        const numero = ++peticion.current;
        setBuscando(true);
        try {
            const lista = await api.listarSeries(aplicados);
            if (numero !== peticion.current) return;
            setSeries(lista);
            setError("");
        } catch (e) {
            if (numero !== peticion.current) return;
            setError(e instanceof ApiError ? e.message : "No se pudieron cargar los contactos periódicos.");
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

    // Llegada desde una notificación: abre esa serie.
    useEffect(() => {
        if (!target?.id) return undefined;
        let activo = true;
        api.obtenerSerie(target.id)
            .then((s) => activo && setDetalle(s))
            .catch((e) => activo && setError(e instanceof ApiError ? e.message : "No se pudo abrir la serie."));
        return () => {
            activo = false;
        };
    }, [target?.id, target?.nonce]);

    const abrir = useCallback(async (id) => {
        setError("");
        try {
            setDetalle(await api.obtenerSerie(id));
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo abrir la serie.");
        }
    }, []);

    const filas = useMemo(
        () =>
            series.map((s) => ({
                id: s.idSerie,
                codigo: s.codigo,
                empresa: s.empresa,
                contacto: s.contacto ?? "—",
                periodicidad: s.periodicidad,
                tipo: s.tipo,
                proxima: s.proximaFecha ? fechaHoraLocal(s.proximaFecha) : "—",
                avance: `${s.completados} de ${s.total}${s.atrasados > 0 ? ` · ${s.atrasados} atrasado(s)` : ""}`,
                responsable: s.responsable ?? "—",
                estado: s.estado,
                ver: (
                    <Button
                        className="flex items-center gap-1.5 !px-3 !py-1.5 text-xs"
                        aria-label={`Ver serie ${s.codigo}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            abrir(s.idSerie);
                        }}
                    >
                        <Eye size={13} /> Ver
                    </Button>
                ),
            })),
        [series, abrir]
    );

    const set = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }));
    const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(FILTROS_INICIALES);

    const resumen = [
        { label: "Series en la lista", value: series.length },
        { label: "Seguimientos pendientes", value: series.reduce((t, s) => t + s.pendientes, 0) },
        { label: "Atrasados", value: series.reduce((t, s) => t + s.atrasados, 0), alerta: series.some((s) => s.atrasados > 0) },
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

            <div className="rounded-xl p-4 mb-4" style={{ border: `1px solid ${COLORS.border}` }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FieldLabel label="Estado de la serie">
                        <select value={filtros.estado} onChange={set("estado")} className={inputClass} style={inputStyle}>
                            {api.ESTADOS_FILTRO_SERIES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                        </select>
                    </FieldLabel>
                    <SeguimientoResponsableSelect
                        label="Responsable"
                        todos="Todos los responsables"
                        value={filtros.idResponsable}
                        onChange={(v) => setFiltros((f) => ({ ...f, idResponsable: v }))}
                    />
                    <FieldLabel label="Buscar">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color={COLORS.muted} />
                            <input value={filtros.texto} onChange={set("texto")} placeholder="Empresa, contacto o motivo..." className={inputClass} style={{ ...inputStyle, paddingLeft: "2.1rem" }} />
                        </div>
                    </FieldLabel>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                    {hayFiltros && (
                        <Button variant="ghost" className="flex items-center gap-1.5" onClick={() => setFiltros(FILTROS_INICIALES)}>
                            <RotateCcw size={14} /> Restablecer filtros
                        </Button>
                    )}
                    {puedeCrear && (
                        <Button variant="primary" className="flex items-center gap-1.5 ml-auto" onClick={() => { setMensaje(null); setCreando(true); }}>
                            <Plus size={15} /> Programar contacto periódico
                        </Button>
                    )}
                </div>
            </div>

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando contactos periódicos...</p>
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
                    emptyMessage={hayFiltros ? api.MENSAJE_SIN_SERIES_FILTRADAS : api.MENSAJE_SIN_SERIES}
                />
            )}

            {creando && (
                <SerieFormModal
                    user={user}
                    onClose={() => setCreando(false)}
                    onSaved={(creada) => {
                        setCreando(false);
                        setMensaje({
                            tono: "success",
                            texto:
                                `Se creó la serie ${creada.codigo} (${creada.periodicidad.toLowerCase()}) para ${creada.empresa} con ${creada.total} seguimientos, cada uno con su identificador. ` +
                                `Próxima fecha: ${creada.proximaFecha ? fechaHoraLocal(creada.proximaFecha) : "sin fecha pendiente"}.`,
                        });
                        cargar();
                    }}
                />
            )}

            {detalle && (
                <SerieDetalleModal
                    key={`${detalle.idSerie}-${detalle.estado}`}
                    serie={detalle}
                    user={user}
                    onClose={() => {
                        setDetalle(null);
                        cargar();
                    }}
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
