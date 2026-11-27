import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ClipboardList, Download, Hourglass, Inbox, RefreshCw, Wrench } from "lucide-react";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import { obtenerDashboardTaller } from "../../services/dashboardService";
import { TIPOS_SERVICIO } from "../tickets/helpers";
import { Columnas, Composicion, Indicador, SinDatos, Tarjeta } from "../charts/Tablero";
import { AVISO, PALETA } from "../charts/paleta";
import { exportarGraficoComoImagen } from "./exportarImagen";

const SIN_FILTROS = { idTecnico: "", tipoServicio: "", desde: "", hasta: "" };
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const mesCorto = (v) => `${MESES[Number(String(v).slice(5, 7)) - 1]} ${String(v).slice(2, 4)}`;
const fecha = (v) => String(v).slice(0, 10).split("-").reverse().join("/");
const GRUPOS = {
    mantenimiento: { titulo: "Mantenimiento", icono: ClipboardList, color: PALETA[1] },
    reparacion: { titulo: "Reparación", icono: Wrench, color: PALETA[2] },
    espera: { titulo: "En espera de repuesto", icono: Hourglass, color: PALETA[3] },
};
const RESOLUCIONES = [
    { nombre: "Reparado", color: PALETA[0] },
    { nombre: "No reparado", color: PALETA[4] },
    { nombre: "Garantía", color: PALETA[5] },
];
const DIAS_ESPERA_MAXIMOS = 2;

function Interruptor({ activo, onCambiar, children }) {
    return (
        <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: COLORS.muted }}>
            <input type="checkbox" checked={activo} onChange={(e) => onCambiar(e.target.checked)} />
            {children}
        </label>
    );
}

// Panel de taller y boletas (DAR-013, 014, 016, 017, 020, 021 y 022). Cada indicador lleva a las boletas que representa.
export default function TallerDashboard({ onNavegar }) {
    const [filtros, setFiltros] = useState(SIN_FILTROS);
    const [rango, setRango] = useState({ desde: "", hasta: "" }); // último rango válido aplicado (DAR-020)
    const [datos, setDatos] = useState(null);
    const [tecnicos, setTecnicos] = useState([]);
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(false);
    const [semana, setSemana] = useState(false);
    const [interanual, setInteranual] = useState(false);
    const [resolucion, setResolucion] = useState("");
    const [comparar, setComparar] = useState({ a: "", b: "" });
    const graficoCerradas = useRef(null);

    const rangoInvalido = Boolean(filtros.desde && filtros.hasta && filtros.desde > filtros.hasta);
    const set = (campo) => (e) => {
        const nuevos = { ...filtros, [campo]: e.target.value };
        setFiltros(nuevos);
        if ((campo === "desde" || campo === "hasta") && !(nuevos.desde && nuevos.hasta && nuevos.desde > nuevos.hasta))
            setRango({ desde: nuevos.desde, hasta: nuevos.hasta });
    };

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const r = await obtenerDashboardTaller({ idTecnico: filtros.idTecnico, tipoServicio: filtros.tipoServicio, desde: rango.desde, hasta: rango.hasta });
            setDatos(r);
            setTecnicos((previos) => (r.carga.length ? r.carga : previos));
            setError("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo cargar el panel de taller.");
        } finally {
            setCargando(false);
        }
    }, [filtros.idTecnico, filtros.tipoServicio, rango]);

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => activo && cargar());
        const cada = setInterval(() => activo && cargar(), 60000);
        return () => {
            activo = false;
            clearInterval(cada);
        };
    }, [cargar]);

    const abrirBoleta = (id) => onNavegar?.({ moduleId: "tickets", id });
    const abrirLista = (filtro) => onNavegar?.({ moduleId: "tickets", filtro });
    const hayFiltros = Object.values(filtros).some(Boolean);
    const periodoTexto = rango.desde || rango.hasta ? `Del ${rango.desde ? fecha(rango.desde) : "inicio"} al ${rango.hasta ? fecha(rango.hasta) : "hoy"}` : null;

    const resoluciones = datos ? RESOLUCIONES.map((r) => ({ ...r, valor: datos.resoluciones.filter((b) => b.resolucion === r.nombre).length })) : [];
    const detalle = datos && resolucion ? datos.resoluciones.filter((b) => b.resolucion === resolucion) : [];
    const carga = datos ? datos.carga.map((t) => ({ ...t, total: t.cerradas + t.enCurso })) : [];
    const promedio = carga.length ? carga.reduce((n, t) => n + t.total, 0) / carga.length : 0;
    const cargaVisible = comparar.a && comparar.b ? carga.filter((t) => [comparar.a, comparar.b].includes(String(t.idTecnico))) : carga;
    const nombreCorto = (n) => String(n).split(" ").slice(0, 2).join(" ");

    return (
        <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 flex flex-wrap items-end gap-3" style={{ border: `1px solid ${COLORS.border}` }}>
                <div className="w-52"><FieldLabel label="Técnico">
                    <select value={filtros.idTecnico} onChange={set("idTecnico")} className={inputClass} style={inputStyle}>
                        <option value="">Todos</option>
                        {tecnicos.map((t) => <option key={t.idTecnico} value={t.idTecnico}>{t.tecnico}</option>)}
                    </select>
                </FieldLabel></div>
                <div className="w-52"><FieldLabel label="Tipo de servicio (ranking)">
                    <select value={filtros.tipoServicio} onChange={set("tipoServicio")} className={inputClass} style={inputStyle}>
                        <option value="">Todos</option>
                        {TIPOS_SERVICIO.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </FieldLabel></div>
                <div className="w-40"><FieldLabel label="Desde">
                    <input type="date" value={filtros.desde} onChange={set("desde")} aria-invalid={rangoInvalido || undefined} className={inputClass} style={inputStyle} />
                </FieldLabel></div>
                <div className="w-40"><FieldLabel label="Hasta">
                    <input type="date" value={filtros.hasta} onChange={set("hasta")} aria-invalid={rangoInvalido || undefined} className={inputClass} style={inputStyle} />
                </FieldLabel></div>
                <Button onClick={() => { setFiltros(SIN_FILTROS); setRango({ desde: "", hasta: "" }); }} disabled={!hayFiltros}>Limpiar</Button>
                <div className="ml-auto flex items-center gap-3">
                    <Interruptor activo={semana} onCambiar={setSemana}>Comparar con la semana anterior</Interruptor>
                    <Button onClick={cargar} disabled={cargando} aria-label="Actualizar"><RefreshCw size={14} className={cargando ? "animate-spin" : ""} /></Button>
                </div>
            </div>

            {rangoInvalido && <Notice tone="error">El rango de fechas ingresado no es válido. Se conserva el último rango aplicado.</Notice>}
            {error && <Notice tone="error">{error}</Notice>}
            {!datos && !error && <p className="text-sm py-10 text-center" style={{ color: COLORS.muted }}>Cargando panel...</p>}

            {datos && (
                <div className="space-y-4" style={{ opacity: cargando ? 0.75 : 1, transition: "opacity .2s" }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {datos.abiertas.map((g) => {
                            const info = GRUPOS[g.grupo];
                            const diferencia = g.abiertas - g.semanaAnterior;
                            const porcentaje = g.semanaAnterior ? `${Math.round((diferencia / g.semanaAnterior) * 100)}% ` : "";
                            return (
                                <button key={g.grupo} type="button" onClick={() => abrirLista({ grupo: g.grupo })} className="text-left rounded-2xl transition-transform hover:-translate-y-0.5" title="Ver estas boletas">
                                    <Indicador titulo={info.titulo} valor={g.abiertas} icono={info.icono} color={info.color}
                                        cambio={semana ? diferencia : undefined} subeEsBueno={false} periodo={`${porcentaje}vs. hace 7 días`}
                                        detalle={semana ? undefined : "Boletas abiertas · ver lista"} />
                                </button>
                            );
                        })}
                        <button type="button" onClick={() => abrirLista({ grupo: "sinTecnico" })} className="text-left rounded-2xl transition-transform hover:-translate-y-0.5" title="Ver estas boletas">
                            <Indicador titulo="Sin técnico" valor={datos.solicitudes.length} icono={Inbox} color={AVISO.atencion}
                                detalle={`${datos.solicitudes.filter((s) => s.dias > DIAS_ESPERA_MAXIMOS).length} esperan más de ${DIAS_ESPERA_MAXIMOS} días`} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <Tarjeta className="xl:col-span-2" titulo="Boletas cerradas por mes" subtitulo={periodoTexto ?? "Últimos 12 meses"}
                            tabla={{ columnas: ["Mes", "Cerradas", "Año anterior"], filas: datos.cerradasPorMes.map((m) => [mesCorto(m.mes), m.cerradas, m.anioAnterior]) }}>
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <Interruptor activo={interanual} onCambiar={setInteranual}>Comparar con el año anterior</Interruptor>
                                <Button onClick={() => exportarGraficoComoImagen(graficoCerradas.current, "Boletas cerradas por mes · SIGRA", "boletas-cerradas.png")}>
                                    <Download size={13} className="inline mr-1.5" />Imagen
                                </Button>
                            </div>
                            <div ref={graficoCerradas}>
                                {datos.cerradasPorMes.some((m) => m.cerradas || (interanual && m.anioAnterior)) ? (
                                    <Columnas datos={datos.cerradasPorMes} categoria="mes" formatoEje={mesCorto} formatoTitulo={mesCorto}
                                        series={interanual
                                            ? [{ key: "anioAnterior", label: "Año anterior", color: "#A9C9A4" }, { key: "cerradas", label: "Este periodo", color: PALETA[0] }]
                                            : [{ key: "cerradas", label: "Cerradas", color: PALETA[0] }]} />
                                ) : <SinDatos mensaje="No hay boletas cerradas en el periodo." />}
                            </div>
                        </Tarjeta>

                        <Tarjeta titulo="Resoluciones" subtitulo="Presione una parte para ver sus boletas"
                            tabla={{ columnas: ["Resolución", "Boletas"], filas: resoluciones.map((r) => [r.nombre, r.valor]) }}>
                            <Composicion partes={resoluciones} elegida={resolucion} alElegir={(n) => setResolucion((v) => (v === n ? "" : n))} />
                            {resolucion && (
                                <div className="mt-4">
                                    <p className="text-xs mb-2" style={{ color: COLORS.charcoal, fontWeight: 600 }}>{resolucion}: {detalle.length} boleta(s)</p>
                                    <ul className="space-y-1.5 max-h-40 overflow-auto">
                                        {detalle.map((b) => (
                                            <li key={b.idTicket}>
                                                <button type="button" onClick={() => abrirBoleta(b.idTicket)} className="w-full text-left text-xs rounded-lg px-2.5 py-1.5 hover:bg-[#F3F7F2]" style={{ border: `1px solid ${COLORS.border}` }}>
                                                    <strong>#{b.numeroBoleta}</strong> {b.empresa}
                                                    <span className="block" style={{ color: COLORS.muted }}>{b.tecnico ?? "Sin técnico"} · {fecha(b.cerrada)}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </Tarjeta>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Tarjeta titulo="Técnicos con más boletas abiertas" subtitulo="La marca es el límite configurado; presione un nombre para ver sus boletas"
                            tabla={{ columnas: ["Técnico", "Abiertas", "Límite"], filas: datos.ranking.map((t) => [t.tecnico, t.abiertas, t.limite]) }}>
                            {datos.ranking.length ? (
                                <ol className="space-y-3">
                                    {datos.ranking.map((t, i) => {
                                        const sobrecarga = t.abiertas > t.limite;
                                        const escala = Math.max(t.limite * 1.4, ...datos.ranking.map((x) => x.abiertas));
                                        return (
                                            <li key={t.idTecnico}>
                                                <div className="flex items-baseline justify-between gap-2 text-xs mb-1">
                                                    <button type="button" onClick={() => abrirLista({ grupo: "abiertas", idTecnico: String(t.idTecnico) })} className="hover:underline text-left" style={{ color: COLORS.charcoal, fontWeight: 600 }}>
                                                        {i + 1}. {t.tecnico}
                                                    </button>
                                                    <span className="flex items-center gap-1 tabular-nums" style={{ color: sobrecarga ? AVISO.critico : COLORS.charcoal, fontWeight: 700 }}>
                                                        {sobrecarga && <><AlertTriangle size={12} />Sobrecarga · </>}{t.abiertas}
                                                    </span>
                                                </div>
                                                <div className="relative h-3 rounded-full" style={{ backgroundColor: "#EEF2EC" }}>
                                                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(t.abiertas / escala) * 100}%`, backgroundColor: sobrecarga ? AVISO.critico : PALETA[1] }} />
                                                    <span className="absolute -top-0.5 -bottom-0.5 w-0.5" title={`Límite: ${t.limite}`} style={{ left: `${(t.limite / escala) * 100}%`, backgroundColor: COLORS.charcoal }} />
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ol>
                            ) : <SinDatos mensaje="No hay técnicos activos." />}
                        </Tarjeta>

                        <Tarjeta titulo="Carga por técnico" subtitulo={periodoTexto ?? "Mes en curso"}
                            tabla={{ columnas: ["Técnico", "Cerradas", "En curso"], filas: carga.map((t) => [t.tecnico, t.cerradas, t.enCurso]) }}>
                            <div className="flex flex-wrap items-center gap-2 mb-2 text-xs" style={{ color: COLORS.muted }}>
                                Comparar
                                {["a", "b"].map((k) => (
                                    <select key={k} value={comparar[k]} onChange={(e) => setComparar((c) => ({ ...c, [k]: e.target.value }))} aria-label={`Técnico ${k === "a" ? "uno" : "dos"}`}
                                        className="rounded-lg px-2 py-1 bg-white" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}>
                                        <option value="">Técnico…</option>
                                        {carga.map((t) => <option key={t.idTecnico} value={t.idTecnico}>{t.tecnico}</option>)}
                                    </select>
                                ))}
                            </div>
                            {carga.some((t) => t.total) ? (
                                <>
                                    <Columnas apiladas alto={200} datos={cargaVisible.map((t) => ({ ...t, nombre: nombreCorto(t.tecnico) }))} categoria="nombre"
                                        series={[{ key: "cerradas", label: "Cerradas", color: PALETA[0] }, { key: "enCurso", label: "En curso", color: PALETA[1] }]} />
                                    <p className="text-xs mt-2" style={{ color: COLORS.muted }}>
                                        Promedio: {promedio.toFixed(1)} boletas.{" "}
                                        {carga.filter((t) => t.total > promedio).length > 0 && (
                                            <span style={{ color: AVISO.atencion, fontWeight: 600 }}>
                                                <AlertTriangle size={12} className="inline mr-1" />
                                                Por encima del promedio: {carga.filter((t) => t.total > promedio).map((t) => nombreCorto(t.tecnico)).join(", ")}
                                            </span>
                                        )}
                                    </p>
                                </>
                            ) : <SinDatos mensaje="No hay boletas atendidas en el periodo." />}
                        </Tarjeta>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <Tarjeta className="xl:col-span-2" titulo="Reparaciones abiertas" subtitulo="De la más antigua a la más reciente; presione una fila para abrir la boleta">
                            {datos.reparaciones.length ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-left" style={{ color: COLORS.muted }}>
                                                {["Boleta", "Cliente", "Equipo", "Técnico", "Etapa", "Días"].map((t) => <th key={t} className="py-2 pr-3 font-medium">{t}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {datos.reparaciones.map((r) => (
                                                <tr key={r.idTicket} tabIndex={0} onClick={() => abrirBoleta(r.idTicket)} onKeyDown={(e) => e.key === "Enter" && abrirBoleta(r.idTicket)}
                                                    className="cursor-pointer hover:brightness-95" style={{ borderTop: `1px solid ${COLORS.border}`, backgroundColor: r.atrasada ? "#FCEDEB" : "#FFFFFF" }}>
                                                    <td className="py-2 px-2" style={{ fontWeight: 700 }}>#{r.numeroBoleta}</td>
                                                    <td className="py-2 pr-3">{r.empresa}</td>
                                                    <td className="py-2 pr-3">{r.equipo ?? "—"}</td>
                                                    <td className="py-2 pr-3">{r.tecnico ?? "Sin técnico"}</td>
                                                    <td className="py-2 pr-3">{r.etapa}</td>
                                                    <td className="py-2 pr-2 whitespace-nowrap tabular-nums" style={{ color: r.atrasada ? AVISO.critico : COLORS.charcoal, fontWeight: 600 }}>
                                                        {r.atrasada && <AlertTriangle size={12} className="inline mr-1" />}{r.dias}{r.atrasada ? " · atrasada" : ""}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <SinDatos mensaje="No hay reparaciones abiertas." />}
                        </Tarjeta>

                        <Tarjeta titulo="Solicitudes sin atender" subtitulo="Las que más tiempo llevan esperando">
                            {datos.solicitudes.length ? (
                                <ul className="space-y-2 max-h-72 overflow-auto">
                                    {datos.solicitudes.map((s) => {
                                        const urgente = s.dias > DIAS_ESPERA_MAXIMOS;
                                        return (
                                            <li key={s.idTicket}>
                                                <button type="button" onClick={() => abrirBoleta(s.idTicket)} className="w-full flex items-center gap-3 text-left rounded-xl px-3 py-2 hover:brightness-95"
                                                    style={{ border: `1px solid ${COLORS.border}`, backgroundColor: urgente ? "#FCEDEB" : "#FFFFFF" }}>
                                                    <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: urgente ? AVISO.critico : AVISO.atencion }} />
                                                    <span className="min-w-0 text-xs flex-1">
                                                        <span className="block truncate" style={{ fontWeight: 600 }}>{s.empresa}</span>
                                                        <span style={{ color: COLORS.muted }}>#{s.numeroBoleta} · {s.tipoServicio} · {fecha(s.recibida)}</span>
                                                    </span>
                                                    <span className="text-xs whitespace-nowrap" style={{ color: urgente ? AVISO.critico : COLORS.muted, fontWeight: 600 }}>{s.dias} d</span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : <SinDatos mensaje="No hay solicitudes pendientes." />}
                        </Tarjeta>
                    </div>
                </div>
            )}
        </div>
    );
}
