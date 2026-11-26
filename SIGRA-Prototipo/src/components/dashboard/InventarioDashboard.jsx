import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BatteryWarning, CheckCircle2, Package, PackageCheck, RefreshCw, Truck, Wrench, XCircle } from "lucide-react";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import { obtenerDashboardInventario } from "../../services/dashboardService";
import { BarrasApiladas, Composicion, Evolucion, Indicador, Medidor, SinDatos, Tarjeta } from "../charts/Tablero";
import { AVISO, ESTADO_EQUIPO } from "../charts/paleta";

const SIN_FILTROS = { idCategoria: "", idModelo: "", desde: "", hasta: "" };
const SERIES_ESTADO = [
    { key: "alquilados", label: "Alquilados", color: ESTADO_EQUIPO.Alquilados },
    { key: "disponibles", label: "Disponibles", color: ESTADO_EQUIPO.Disponibles },
    { key: "enTaller", label: "En taller", color: ESTADO_EQUIPO.EnTaller },
];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const mesCorto = (v) => `${MESES[Number(String(v).slice(5, 7)) - 1]} ${String(v).slice(2, 4)}`;
const fecha = (v) => String(v).slice(0, 10).split("-").reverse().join("/");

// Panel de indicadores del inventario (DAR-001, 002, 003, 004 y 008). Se actualiza solo cada minuto.
export default function InventarioDashboard() {
    const [filtros, setFiltros] = useState(SIN_FILTROS);
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(false);
    const [actualizado, setActualizado] = useState(null);

    const rangoInvalido = Boolean(filtros.desde && filtros.hasta && filtros.desde > filtros.hasta);
    const set = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value, ...(campo === "idCategoria" ? { idModelo: "" } : {}) }));

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            setDatos(await obtenerDashboardInventario(filtros));
            setActualizado(new Date());
            setError("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudieron cargar los indicadores.");
        } finally {
            setCargando(false);
        }
    }, [filtros]);

    useEffect(() => {
        if (rangoInvalido) return undefined;
        let activo = true;
        Promise.resolve().then(() => activo && cargar());
        const cada = setInterval(() => activo && cargar(), 60000);
        return () => {
            activo = false;
            clearInterval(cada);
        };
    }, [cargar, rangoInvalido]);

    const ind = datos?.indicadores;
    const categorias = datos ? [...new Map(datos.modelos.map((m) => [m.idCategoria, m.categoria])).entries()] : [];
    const modelos = datos ? datos.modelos.filter((m) => !filtros.idCategoria || String(m.idCategoria) === filtros.idCategoria) : [];
    const hayFiltros = Object.values(filtros).some(Boolean);
    const sinEquipos = ind && ind.total + ind.dadosDeBaja === 0;

    return (
        <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 flex flex-wrap items-end gap-3" style={{ border: `1px solid ${COLORS.border}` }}>
                <div className="w-44"><FieldLabel label="Categoría">
                    <select value={filtros.idCategoria} onChange={set("idCategoria")} className={inputClass} style={inputStyle}>
                        <option value="">Todas</option>
                        {categorias.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                    </select>
                </FieldLabel></div>
                <div className="w-52"><FieldLabel label="Modelo">
                    <select value={filtros.idModelo} onChange={set("idModelo")} className={inputClass} style={inputStyle}>
                        <option value="">Todos</option>
                        {modelos.map((m) => <option key={m.idModelo} value={m.idModelo}>{m.modelo}</option>)}
                    </select>
                </FieldLabel></div>
                <div className="w-40"><FieldLabel label="Desde">
                    <input type="date" value={filtros.desde} onChange={set("desde")} aria-invalid={rangoInvalido || undefined} className={inputClass} style={inputStyle} />
                </FieldLabel></div>
                <div className="w-40"><FieldLabel label="Hasta">
                    <input type="date" value={filtros.hasta} onChange={set("hasta")} aria-invalid={rangoInvalido || undefined} className={inputClass} style={inputStyle} />
                </FieldLabel></div>
                <Button onClick={() => setFiltros(SIN_FILTROS)} disabled={!hayFiltros}>Limpiar</Button>
                <div className="ml-auto flex items-center gap-2 text-xs" style={{ color: COLORS.muted }}>
                    {actualizado && <span>Actualizado a las {actualizado.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}</span>}
                    <Button onClick={cargar} disabled={cargando || rangoInvalido} aria-label="Actualizar"><RefreshCw size={14} className={cargando ? "animate-spin" : ""} /></Button>
                </div>
            </div>

            {rangoInvalido && <Notice tone="error">La fecha inicial no puede ser posterior a la final. Corrija el rango de fechas.</Notice>}
            {error && <Notice tone="error">{error}</Notice>}
            {!datos && !error && <p className="text-sm py-10 text-center" style={{ color: COLORS.muted }}>Cargando indicadores...</p>}
            {sinEquipos && <Notice tone="warning">No hay equipos que coincidan con los filtros. Cambie la categoría, el modelo o las fechas.</Notice>}

            {datos && !sinEquipos && (
                <div className="space-y-4" style={{ opacity: cargando ? 0.75 : 1, transition: "opacity .2s" }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        <Indicador titulo="Equipos en inventario" valor={ind.total} icono={Package} color="#4A3AA7" detalle={`${ind.dadosDeBaja} dados de baja aparte`} />
                        <Indicador titulo="Alquilados" valor={ind.alquilados} icono={Truck} color={ESTADO_EQUIPO.Alquilados} cambio={ind.cambioAlquilados30} serie={datos.evolucion.map((p) => p.alquilados)} />
                        <Indicador titulo="Disponibles" valor={ind.disponibles} icono={PackageCheck} color={ESTADO_EQUIPO.Disponibles} cambio={ind.cambioDisponibles30} serie={datos.evolucion.map((p) => p.disponibles)} />
                        <Indicador titulo="En taller" valor={ind.enTaller} icono={Wrench} color={ESTADO_EQUIPO.EnTaller}
                            detalle={`${ind.enReparacion} reparación · ${ind.enMantenimiento} mantenimiento · ${ind.enGarantia} garantía`} />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <Tarjeta className="xl:col-span-2" titulo="Alquilado frente a disponible" subtitulo="Equipos al cierre de cada mes"
                            tabla={{ columnas: ["Mes", "Alquilados", "Disponibles"], filas: datos.evolucion.map((p) => [mesCorto(p.mes), p.alquilados, p.disponibles]) }}>
                            {datos.evolucion.some((p) => p.alquilados + p.disponibles > 0) ? (
                                <Evolucion datos={datos.evolucion} categoria="mes" formatoEje={mesCorto} formatoTitulo={mesCorto} series={SERIES_ESTADO.slice(0, 2)} />
                            ) : <SinDatos mensaje="No hay movimientos registrados en el periodo." />}
                        </Tarjeta>
                        <Tarjeta titulo="Estado de la flota hoy" subtitulo="Cómo se reparte el inventario"
                            tabla={{ columnas: ["Estado", "Equipos"], filas: [["Alquilados", ind.alquilados], ["Disponibles", ind.disponibles], ["En taller", ind.enTaller]] }}>
                            <Composicion partes={[
                                { nombre: "Alquilados", valor: ind.alquilados, color: ESTADO_EQUIPO.Alquilados },
                                { nombre: "Disponibles", valor: ind.disponibles, color: ESTADO_EQUIPO.Disponibles },
                                { nombre: "En taller", valor: ind.enTaller, color: ESTADO_EQUIPO.EnTaller },
                            ]} />
                            <div className="mt-5 rounded-xl p-3 text-xs" style={{ backgroundColor: "#F6FAF5", color: COLORS.charcoal }}>
                                <strong>{ind.total ? Math.round((ind.alquilados / ind.total) * 100) : 0}%</strong> del inventario está generando ingresos por alquiler.
                            </div>
                        </Tarjeta>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Tarjeta titulo="Equipos por categoría" subtitulo="Presione una barra para filtrar"
                            tabla={{ columnas: ["Categoría", "Alquilados", "Disponibles", "En taller"], filas: datos.porCategoria.map((c) => [c.categoria, c.alquilados, c.disponibles, c.enTaller]) }}>
                            {datos.porCategoria.length ? (
                                <BarrasApiladas datos={datos.porCategoria} categoria="categoria" series={SERIES_ESTADO}
                                    alFiltrar={(c) => setFiltros((f) => ({ ...f, idCategoria: String(c.idCategoria), idModelo: "" }))} />
                            ) : <SinDatos mensaje="Sin equipos en las categorías seleccionadas." />}
                        </Tarjeta>

                        <Tarjeta titulo="Stock contra el mínimo" subtitulo="La marca vertical es el mínimo de cada categoría"
                            tabla={{ columnas: ["Categoría", "Disponibles", "Mínimo"], filas: datos.stock.map((s) => [s.categoria, s.disponibles, s.minimo]) }}>
                            {datos.stock.length ? (
                                <div className="space-y-4">
                                    {datos.stock.map((s) => {
                                        const nivel = s.disponibles < s.minimo ? ["Bajo el mínimo", AVISO.critico, XCircle]
                                            : s.disponibles === s.minimo ? ["En el límite", AVISO.atencion, AlertTriangle] : ["Suficiente", AVISO.bien, CheckCircle2];
                                        return <Medidor key={s.idCategoria} nombre={s.categoria} valor={s.disponibles} minimo={s.minimo} estado={nivel[0]} color={nivel[1]} icono={nivel[2]} />;
                                    })}
                                </div>
                            ) : <SinDatos mensaje="No hay mínimos configurados para estas categorías." />}
                        </Tarjeta>

                        <Tarjeta titulo="Baterías por cambiar" subtitulo="Radios alquilados a un mes o menos de cumplir el ciclo de 12 meses"
                            tabla={{ columnas: ["Serie", "Cliente", "Vence"], filas: datos.baterias.map((b) => [b.numeroSerie, b.empresa, fecha(b.fechaVencimiento)]) }}>
                            {datos.baterias.length ? (
                                <>
                                    <p className="flex items-center gap-2 mb-3">
                                        <BatteryWarning size={20} style={{ color: AVISO.atencion }} />
                                        <span className="text-3xl leading-none" style={{ color: COLORS.charcoal, fontWeight: 700 }}>{datos.baterias.length}</span>
                                        <span className="text-xs" style={{ color: COLORS.muted }}>{datos.baterias.filter((b) => b.estado === "Vencida").length} ya vencidas</span>
                                    </p>
                                    <ul className="space-y-2 max-h-56 overflow-auto">
                                        {datos.baterias.map((b) => {
                                            const vencida = b.estado === "Vencida";
                                            return (
                                                <li key={b.numeroSerie} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ border: `1px solid ${COLORS.border}` }}>
                                                    <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: vencida ? AVISO.critico : AVISO.atencion }} />
                                                    <span className="min-w-0 text-xs">
                                                        <span className="block truncate" style={{ color: COLORS.charcoal, fontWeight: 600 }}>{b.numeroSerie} · {b.empresa}</span>
                                                        <span style={{ color: COLORS.muted }}>{vencida ? "Venció" : "Vence"} el {fecha(b.fechaVencimiento)}</span>
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </>
                            ) : <SinDatos mensaje="No hay radios con la batería próxima a vencer." />}
                        </Tarjeta>
                    </div>
                </div>
            )}
        </div>
    );
}
