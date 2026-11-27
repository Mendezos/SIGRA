import { useCallback, useEffect, useState } from "react";
import {
    AlertOctagon, AlertTriangle, ArrowRight, BatteryWarning, Bookmark, CalendarClock, CheckCircle2, ClipboardList, FileText, Info,
    Package, RadioTower, Receipt, RefreshCw, UserX, X,
} from "lucide-react";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/alertasService";
import { Composicion, SinDatos, Tarjeta } from "../charts/Tablero";
import { AVISO, PALETA } from "../charts/paleta";

const MODULOS = { 2: "Tickets", 3: "Alquiler", 4: "Inventario", 7: "Contratos y facturación", 9: "CRM", 11: "Frecuencias" };
const URGENCIAS = {
    3: { nombre: "Alta", color: AVISO.critico, fondo: "#FCEDEB", icono: AlertOctagon },
    2: { nombre: "Media", color: AVISO.atencion, fondo: "#FFF6E3", icono: AlertTriangle },
    1: { nombre: "Baja", color: "#2A78D6", fondo: "#EAF2FC", icono: Info },
};
const CATEGORIAS = {
    "Stock mínimo": Package, "Batería": BatteryWarning, "Contrato": FileText, "Frecuencia": RadioTower,
    "Sin técnico": UserX, "Boleta atrasada": ClipboardList, "Seguimiento": CalendarClock, "Cobro": Receipt,
};
const SIN_FILTROS = { idModulo: "", urgencia: "", idResponsable: "" };

// A dónde lleva cada alerta.
function destino(a) {
    if (a.entidad === "boleta") return { moduleId: "tickets", id: a.idEntidad };
    if (a.entidad === "seguimiento") return { moduleId: "crm", tab: "agenda", id: a.idEntidad };
    if (a.entidad === "frecuencia") return { moduleId: "frecuencias" };
    if (a.entidad === "categoria") return { moduleId: "inventario" };
    if (a.entidad === "equipo") return { moduleId: "alquiler" };
    return { moduleId: "contratos" };
}

export default function AlertasDashboard({ onNavegar }) {
    const [datos, setDatos] = useState(null);
    const [vistas, setVistas] = useState([]);
    const [filtros, setFiltros] = useState(SIN_FILTROS);
    const [nombreVista, setNombreVista] = useState("");
    const [atendiendo, setAtendiendo] = useState(null);
    const [nota, setNota] = useState("");
    const [errorNota, setErrorNota] = useState("");
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const fallo = (e, porDefecto) => setError(e instanceof ApiError ? e.message : porDefecto);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const [lista, favoritas] = await Promise.all([api.listarAlertas(), api.listarVistas()]);
            setDatos(lista);
            setVistas(favoritas);
            setError("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudieron cargar las alertas.");
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => activo && cargar());
        const cada = setInterval(() => activo && cargar(), 60000);
        return () => {
            activo = false;
            clearInterval(cada);
        };
    }, [cargar]);

    async function atender(e) {
        e.preventDefault();
        if (!nota.trim()) {
            setErrorNota("Escriba una nota de seguimiento para atender la alerta.");
            return;
        }
        setGuardando(true);
        try {
            setDatos(await api.atenderAlerta(atendiendo.clave, nota.trim()));
            setMensaje(`Se atendió: ${atendiendo.titulo}`);
            setAtendiendo(null);
        } catch (err) {
            setErrorNota(err instanceof ApiError ? err.message : "No se pudo atender la alerta.");
        } finally {
            setGuardando(false);
        }
    }

    async function guardarVista() {
        try {
            setVistas(await api.guardarVista(nombreVista.trim(), filtros));
            setNombreVista("");
            setMensaje("Vista guardada. Aplíquela con un clic cuando quiera.");
            setError("");
        } catch (e) {
            fallo(e, "No se pudo guardar la vista.");
        }
    }

    const alertas = datos?.alertas ?? [];
    const responsables = [...new Map(alertas.filter((a) => a.idResponsable).map((a) => [a.idResponsable, a.responsable])).entries()];
    const modulos = [...new Set(alertas.map((a) => a.idModulo))].sort((a, b) => a - b);
    const visibles = alertas.filter((a) =>
        (!filtros.idModulo || String(a.idModulo) === filtros.idModulo) &&
        (!filtros.urgencia || String(a.urgencia) === filtros.urgencia) &&
        (!filtros.idResponsable || String(a.idResponsable) === filtros.idResponsable));
    const hayFiltros = Object.values(filtros).some(Boolean);
    const porModulo = modulos.map((m, i) => ({ nombre: MODULOS[m] ?? `Módulo ${m}`, valor: alertas.filter((a) => a.idModulo === m).length, color: PALETA[i % PALETA.length], id: String(m) }));
    const set = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }));

    return (
        <div className="space-y-4">
            {error && <Notice tone="error">{error}</Notice>}
            {mensaje && <Notice tone="success">{mensaje}</Notice>}
            {!datos && !error && <p className="text-sm py-10 text-center" style={{ color: COLORS.muted }}>Cargando alertas...</p>}

            {datos && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                        {[3, 2, 1].map((u) => {
                            const info = URGENCIAS[u];
                            const cuantas = alertas.filter((a) => a.urgencia === u).length;
                            const activa = filtros.urgencia === String(u);
                            return (
                                <button key={u} type="button" aria-pressed={activa} onClick={() => setFiltros((f) => ({ ...f, urgencia: activa ? "" : String(u) }))}
                                    className="flex flex-col justify-center text-left rounded-2xl p-4 transition-transform hover:-translate-y-0.5" style={{ backgroundColor: info.fondo, border: `2px solid ${activa ? info.color : "transparent"}` }}>
                                    <span className="flex items-center gap-2 text-xs" style={{ color: info.color, fontWeight: 700 }}><info.icono size={16} />Urgencia {info.nombre.toLowerCase()}</span>
                                    <span className="block text-4xl mt-3 leading-none" style={{ color: COLORS.charcoal, fontWeight: 700 }}>{cuantas}</span>
                                </button>
                            );
                        })}
                        <Tarjeta className="lg:col-span-2" titulo="Alertas por módulo" subtitulo="Presione una parte para filtrar"
                            tabla={{ columnas: ["Módulo", "Alertas"], filas: porModulo.map((p) => [p.nombre, p.valor]) }}>
                            {porModulo.length ? (
                                <Composicion partes={porModulo} elegida={porModulo.find((p) => p.id === filtros.idModulo)?.nombre ?? ""}
                                    alElegir={(nombre) => {
                                        const id = porModulo.find((p) => p.nombre === nombre)?.id ?? "";
                                        setFiltros((f) => ({ ...f, idModulo: f.idModulo === id ? "" : id }));
                                    }} />
                            ) : <SinDatos mensaje="No hay alertas activas." />}
                        </Tarjeta>
                    </div>

                    <div className="rounded-2xl bg-white p-4 space-y-3" style={{ border: `1px solid ${COLORS.border}` }}>
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="w-52"><FieldLabel label="Módulo">
                                <select value={filtros.idModulo} onChange={set("idModulo")} className={inputClass} style={inputStyle}>
                                    <option value="">Todos</option>
                                    {modulos.map((m) => <option key={m} value={m}>{MODULOS[m] ?? m}</option>)}
                                </select>
                            </FieldLabel></div>
                            <div className="w-36"><FieldLabel label="Urgencia">
                                <select value={filtros.urgencia} onChange={set("urgencia")} className={inputClass} style={inputStyle}>
                                    <option value="">Todas</option>
                                    {[3, 2, 1].map((u) => <option key={u} value={u}>{URGENCIAS[u].nombre}</option>)}
                                </select>
                            </FieldLabel></div>
                            <div className="w-56"><FieldLabel label="Responsable">
                                <select value={filtros.idResponsable} onChange={set("idResponsable")} className={inputClass} style={inputStyle}>
                                    <option value="">Todos</option>
                                    {responsables.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                                </select>
                            </FieldLabel></div>
                            <Button onClick={() => setFiltros(SIN_FILTROS)} disabled={!hayFiltros}>Limpiar filtros</Button>
                            <div className="ml-auto flex items-center gap-2">
                                <input value={nombreVista} onChange={(e) => setNombreVista(e.target.value)} maxLength={60} placeholder="Nombre de la vista" aria-label="Nombre de la vista"
                                    className="rounded-lg px-3 py-2 text-sm bg-white" style={{ border: `1px solid ${COLORS.border}` }} />
                                <Button onClick={guardarVista} disabled={!hayFiltros || !nombreVista.trim()}><Bookmark size={14} className="inline mr-1.5" />Guardar vista</Button>
                                <Button onClick={cargar} disabled={cargando} aria-label="Actualizar"><RefreshCw size={14} className={cargando ? "animate-spin" : ""} /></Button>
                            </div>
                        </div>
                        {vistas.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span style={{ color: COLORS.muted }}>Vistas favoritas:</span>
                                {vistas.map((v) => (
                                    <span key={v.idVista} className="inline-flex items-center rounded-full overflow-hidden" style={{ backgroundColor: "#EAF6E8" }}>
                                        <button type="button" className="px-3 py-1.5 hover:underline" style={{ color: COLORS.charcoal, fontWeight: 600 }}
                                            onClick={() => { try { setFiltros({ ...SIN_FILTROS, ...JSON.parse(v.filtros) }); } catch { setError("La vista guardada no se pudo leer."); } }}>
                                            {v.nombre}
                                        </button>
                                        <button type="button" className="pr-2" aria-label={`Eliminar la vista ${v.nombre}`} style={{ color: COLORS.muted }}
                                            onClick={() => api.eliminarVista(v.idVista).then(setVistas).catch((e) => fallo(e, "No se pudo eliminar la vista."))}>
                                            <X size={13} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <Tarjeta titulo={`Alertas activas (${visibles.length})`} subtitulo="Ordenadas por prioridad: primero lo más urgente y lo más antiguo">
                        {visibles.length === 0 ? (
                            <SinDatos mensaje={hayFiltros ? "No hay alertas que coincidan con los filtros seleccionados." : "No hay alertas activas. Todo está al día."} />
                        ) : (
                            <ul className="space-y-2">
                                {visibles.map((a) => {
                                    const info = URGENCIAS[a.urgencia] ?? URGENCIAS[1];
                                    const Icono = CATEGORIAS[a.categoria] ?? Info;
                                    return (
                                        <li key={a.clave} className="flex flex-wrap items-center gap-3 rounded-xl px-3 py-3" style={{ border: `1px solid ${COLORS.border}` }}>
                                            <span className="w-1.5 self-stretch rounded-full" style={{ backgroundColor: info.color }} />
                                            <span className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0" style={{ backgroundColor: info.fondo, color: info.color }}><Icono size={17} /></span>
                                            <span className="flex-1 min-w-[14rem]">
                                                <span className="block text-sm" style={{ color: COLORS.charcoal, fontWeight: 600 }}>{a.titulo}</span>
                                                <span className="block text-xs" style={{ color: COLORS.muted }}>{a.detalle}</span>
                                                <span className="block text-[11px] mt-0.5" style={{ color: COLORS.muted }}>{a.categoria} · {MODULOS[a.idModulo]} · {a.responsable ?? "Sin responsable"}</span>
                                            </span>
                                            <span className="text-xs flex items-center gap-1" style={{ color: info.color, fontWeight: 700 }}><info.icono size={13} />{info.nombre}</span>
                                            <Button onClick={() => onNavegar?.(destino(a))}><ArrowRight size={14} className="inline mr-1" />Abrir</Button>
                                            {a.puedeAtender && (
                                                <Button variant="primary" onClick={() => { setAtendiendo(a); setNota(""); setErrorNota(""); setMensaje(""); }}>Atender</Button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Tarjeta>

                    {datos.atendidas.length > 0 && (
                        <Tarjeta titulo="Atendidas recientemente" subtitulo="Quién la atendió, cuándo y con qué nota">
                            <ul className="space-y-2">
                                {datos.atendidas.map((a) => (
                                    <li key={a.clave} className="flex items-start gap-2.5 text-xs">
                                        <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: AVISO.bien }} />
                                        <span>
                                            <span style={{ color: COLORS.charcoal, fontWeight: 600 }}>{a.titulo}</span>
                                            <span style={{ color: COLORS.muted }}> · {a.usuario} · {String(a.fecha).slice(0, 10).split("-").reverse().join("/")} {String(a.fecha).slice(11, 16)}</span>
                                            <span className="block" style={{ color: COLORS.charcoal }}>{a.nota}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </Tarjeta>
                    )}
                </>
            )}

            {atendiendo && (
                <Modal open onClose={() => setAtendiendo(null)} icon={CheckCircle2} title="Atender alerta" subtitle={atendiendo.titulo} width="max-w-lg"
                    footer={<div className="flex justify-end gap-2"><Button onClick={() => setAtendiendo(null)}>Cancelar</Button><Button variant="primary" type="submit" form="form-atender" disabled={guardando}>{guardando ? "Guardando..." : "Marcar como atendida"}</Button></div>}>
                    <form id="form-atender" onSubmit={atender} noValidate>
                        <p className="text-sm mb-3" style={{ color: COLORS.muted }}>{atendiendo.detalle}</p>
                        <FieldLabel label="Nota de seguimiento *">
                            <textarea value={nota} onChange={(e) => { setNota(e.target.value); setErrorNota(""); }} rows={3} maxLength={500} className={inputClass} style={inputStyle} placeholder="Qué se hizo o qué se va a hacer" />
                        </FieldLabel>
                        {errorNota && <p className="text-sm mt-2" style={{ color: AVISO.critico }}>{errorNota}</p>}
                    </form>
                </Modal>
            )}
        </div>
    );
}
