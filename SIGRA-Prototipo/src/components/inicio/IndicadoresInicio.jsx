import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Boxes, FileText, Radio, Ticket } from "lucide-react";
import { BarChartCard, DonutCard, KpiCard } from "../charts/Graficos";
import { COLORS } from "../uiTheme";
import * as inventario from "../../services/inventarioService";
import * as alquiler from "../../services/alquilerService";
import * as tickets from "../../services/ticketsService";
import * as frecuencias from "../../services/frecuenciasService";
import { colones } from "../alquiler/helpers";

// Módulo que da permiso de lectura para cada sección (ids de la tabla Modulo).
const MODULO = { tickets: 2, alquiler: 3, inventario: 4, frecuencias: 11 };

// Qué secciones ve cada rol y en qué orden: primero lo que más le importa a su trabajo.
const ORDEN_POR_ROL = {
    "administrador del sistema": ["tickets", "alquiler", "inventario", "frecuencias"],
    gerente: ["alquiler", "frecuencias", "inventario", "tickets"],
    "coordinador tecnico": ["tickets", "inventario"],
    tecnico: ["tickets", "inventario"],
    vendedor: ["alquiler", "frecuencias"],
    recepcionista: ["tickets"],
};

const TITULO_POR_ROL = {
    "administrador del sistema": "Panorama general del sistema",
    gerente: "Indicadores de gestión",
    "coordinador tecnico": "Servicio técnico e inventario",
    tecnico: "Tu trabajo e inventario",
    vendedor: "Tus contratos y frecuencias",
    recepcionista: "Boletas de servicio técnico",
};

const quitarTildes = (texto = "") => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function claveDeRol(rol) {
    const r = quitarTildes(rol);
    return r.startsWith("vendedor") ? "vendedor" : r;
}

const COLOR_ESTADO_CONTRATO = {
    Activo: "#5EB453",
    Renovado: "#3B82A0",
    "Por vencer (90 días)": "#E0C14B",
    "Por vencer (30 días)": "#E08A26",
    Vencido: "#C0392B",
    Cancelado: "#9A9A9A",
};

const SERIES_STOCK = [
    { key: "disponibles", label: "Disponibles", color: "#5EB453" },
    { key: "enUso", label: "En uso (alquilados)", color: "#3B82A0" },
    { key: "enTaller", label: "En taller", color: "#E0A526" },
    { key: "dadosDeBaja", label: "Dados de baja", color: "#C0392B" },
];

const COLOR_ESTADO_BOLETA = {
    Creada: "#9A9A9A",
    Asignada: "#3B82A0",
    "En proceso": "#E0A526",
    Cerrada: "#5EB453",
    Cancelada: "#C0392B",
};

function useCarga(cargar) {
    const [estado, setEstado] = useState({ cargando: true, datos: null, error: false });

    useEffect(() => {
        let activo = true;
        cargar()
            .then((datos) => activo && setEstado({ cargando: false, datos, error: false }))
            .catch(() => activo && setEstado({ cargando: false, datos: null, error: true }));
        return () => {
            activo = false;
        };
    }, [cargar]);

    return estado;
}

function Seccion({ titulo, icono: Icono, onVer, children }) {
    return (
        <section className="rounded-2xl p-5 sm:p-6" style={{ border: `1px solid ${COLORS.border}`, backgroundColor: "#FFFFFF" }}>
            <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="flex items-center gap-2.5 text-sm" style={{ color: COLORS.charcoal, fontWeight: 600 }}>
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: COLORS.greenTint, color: COLORS.greenDark }}>
                        <Icono size={16} />
                    </span>
                    {titulo}
                </h3>
                {onVer && (
                    <button
                        type="button"
                        onClick={onVer}
                        className="inline-flex items-center gap-1 text-xs"
                        style={{ color: COLORS.greenDark, fontWeight: 600 }}
                    >
                        Ver módulo <ArrowRight size={13} />
                    </button>
                )}
            </div>
            {children}
        </section>
    );
}

function Cargando() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[74px] rounded-lg animate-pulse" style={{ backgroundColor: COLORS.greenTint }} />
            ))}
        </div>
    );
}

function Tarjetas({ items }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {items.map((t) => (
                <KpiCard key={t.titulo} titulo={t.titulo} valor={t.valor} color={t.color} detalle={t.detalle} />
            ))}
        </div>
    );
}

// ---------- Inventario ----------
const cargarStock = () => inventario.stockPorCategoria();

function SeccionInventario({ onVer }) {
    const { cargando, datos, error } = useCarga(cargarStock);
    const categorias = useMemo(() => datos ?? [], [datos]);

    const totales = useMemo(() => {
        const suma = (k) => categorias.reduce((n, c) => n + (c[k] ?? 0), 0);
        return { total: suma("total"), disponibles: suma("disponibles"), enUso: suma("enUso"), enTaller: suma("enTaller"), dadosDeBaja: suma("dadosDeBaja") };
    }, [categorias]);

    if (error) return null;

    const dona = SERIES_STOCK.map((s) => ({ name: s.label, value: totales[s.key] })).filter((d) => d.value > 0);
    const colores = Object.fromEntries(SERIES_STOCK.map((s) => [s.label, s.color]));
    const bajoMinimo = categorias.filter((c) => c.cantidadMinima > 0 && c.disponibles <= c.cantidadMinima);
    const barras = categorias.filter((c) => c.total > 0).map((c) => ({ nombre: c.categoria, ...c }));

    return (
        <Seccion titulo="Inventario de equipos" icono={Boxes} onVer={onVer}>
            {cargando ? <Cargando /> : (
                <>
                    <Tarjetas
                        items={[
                            { titulo: "Total de equipos", valor: totales.total },
                            { titulo: "Disponibles", valor: totales.disponibles, color: COLORS.greenDark },
                            { titulo: "En uso (alquilados)", valor: totales.enUso },
                            { titulo: "En taller", valor: totales.enTaller },
                        ]}
                    />
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                        <div className="lg:col-span-2">
                            <DonutCard titulo="Equipos por estado" datos={dona} colores={colores} vacio="Sin equipos registrados" />
                        </div>
                        <div className="lg:col-span-3">
                            <BarChartCard titulo="Stock por categoría" datos={barras} series={SERIES_STOCK} apiladas alto={270} vacio="Sin equipos registrados" />
                        </div>
                    </div>
                    {bajoMinimo.length > 0 && (
                        <ul className="mt-4 space-y-2">
                            {bajoMinimo.map((c) => (
                                <li key={c.idCategoria} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm" style={{ backgroundColor: COLORS.redTint, color: COLORS.red }}>
                                    <AlertTriangle size={15} className="shrink-0" />
                                    <span><strong>{c.categoria}</strong> está en el stock mínimo ({c.disponibles} disponibles, mínimo {c.cantidadMinima}).</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </Seccion>
    );
}

// ---------- Alquiler ----------
const cargarContratos = () => alquiler.listarContratos();
const cargarBaterias = () => alquiler.bateriasPorCambiar().catch(() => []);

function SeccionAlquiler({ onVer }) {
    const { cargando, datos, error } = useCarga(cargarContratos);
    const baterias = useCarga(cargarBaterias);
    const contratos = useMemo(() => datos ?? [], [datos]);

    const conteo = useMemo(() => {
        const c = {};
        contratos.forEach((x) => { c[x.estado] = (c[x.estado] ?? 0) + 1; });
        return c;
    }, [contratos]);

    if (error) return null;

    const dona = Object.entries(conteo).map(([name, value]) => ({ name, value }));
    const vigentes = contratos.filter((c) => ["Activo", "Renovado", "Por vencer (90 días)", "Por vencer (30 días)"].includes(c.estado));
    const ingreso = vigentes.reduce((n, c) => n + (c.montoMensual ?? 0), 0);
    const porVencer = (conteo["Por vencer (90 días)"] ?? 0) + (conteo["Por vencer (30 días)"] ?? 0);
    const proximos = contratos
        .filter((c) => c.estado.startsWith("Por vencer"))
        .sort((a, b) => String(a.fechaVencimiento).localeCompare(String(b.fechaVencimiento)))
        .slice(0, 4);
    const cantidadBaterias = Array.isArray(baterias.datos) ? baterias.datos.length : 0;

    return (
        <Seccion titulo="Contratos de alquiler" icono={FileText} onVer={onVer}>
            {cargando ? <Cargando /> : (
                <>
                    <Tarjetas
                        items={[
                            { titulo: "Contratos vigentes", valor: vigentes.length, color: COLORS.greenDark },
                            { titulo: "Por vencer", valor: porVencer, color: porVencer > 0 ? "#B7791F" : undefined },
                            { titulo: "Ingreso mensual vigente", valor: colones(ingreso) },
                            { titulo: "Baterías por cambiar", valor: cantidadBaterias, color: cantidadBaterias > 0 ? COLORS.red : undefined },
                        ]}
                    />
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                        <div className="lg:col-span-2">
                            <DonutCard titulo="Contratos por estado" datos={dona} colores={COLOR_ESTADO_CONTRATO} vacio="Sin contratos todavía" />
                        </div>
                        <div className="lg:col-span-3 rounded-xl p-4" style={{ border: `1px solid ${COLORS.border}` }}>
                            <h3 className="text-xs uppercase tracking-wide mb-3" style={{ color: COLORS.muted, fontWeight: 600 }}>
                                Próximos a vencer
                            </h3>
                            {proximos.length === 0 ? (
                                <p className="text-sm py-8 text-center" style={{ color: COLORS.muted }}>No hay contratos próximos a vencer</p>
                            ) : (
                                <ul className="space-y-2">
                                    {proximos.map((c) => (
                                        <li key={c.idContrato} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm" style={{ backgroundColor: "#FBF3DE", color: "#7A5E10" }}>
                                            <span className="min-w-0 truncate"><strong>{alquiler.codigoContrato(c.idContrato)}</strong> · {c.empresa}</span>
                                            <span className="shrink-0 text-xs">{c.estado}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </>
            )}
        </Seccion>
    );
}

// ---------- Servicio técnico ----------
const cargarTickets = () =>
    Promise.all([tickets.resumen(), tickets.listar({ pagina: 1, tamanoPagina: 100 })]).then(([resumen, lista]) => ({ resumen, lista }));

function SeccionTickets({ onVer }) {
    const { cargando, datos, error } = useCarga(cargarTickets);

    const items = useMemo(() => datos?.lista?.items ?? [], [datos]);
    const porEstado = useMemo(() => {
        const c = {};
        items.forEach((b) => { c[b.estado] = (c[b.estado] ?? 0) + 1; });
        return Object.entries(c).map(([name, value]) => ({ name, value }));
    }, [items]);
    const cargaPorTecnico = useMemo(() => {
        const c = {};
        items
            .filter((b) => b.estado === "Asignada" || b.estado === "En proceso")
            .forEach((b) => {
                const nombre = b.tecnico ?? "Sin asignar";
                c[nombre] = (c[nombre] ?? 0) + 1;
            });
        return Object.entries(c).map(([nombre, abiertas]) => ({ nombre, abiertas }));
    }, [items]);

    if (error) return null;

    const resumen = datos?.resumen;

    return (
        <Seccion titulo="Servicio técnico" icono={Ticket} onVer={onVer}>
            {cargando ? <Cargando /> : (
                <>
                    <Tarjetas
                        items={[
                            { titulo: "Boletas abiertas", valor: resumen?.abiertas ?? 0 },
                            { titulo: "En proceso", valor: resumen?.enProceso ?? 0, color: COLORS.greenDark },
                            { titulo: "Cerradas este mes", valor: resumen?.cerradasMes ?? 0 },
                            { titulo: "Boletas registradas", valor: datos?.lista?.total ?? 0 },
                        ]}
                    />
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                        <div className="lg:col-span-2">
                            <DonutCard titulo="Boletas por estado" datos={porEstado} colores={COLOR_ESTADO_BOLETA} vacio="Sin boletas registradas" />
                        </div>
                        <div className="lg:col-span-3">
                            <BarChartCard
                                titulo="Boletas abiertas por técnico"
                                datos={cargaPorTecnico}
                                series={[{ key: "abiertas", label: "Boletas abiertas", color: "#3B82A0" }]}
                                alto={260}
                                vacio="No hay boletas abiertas"
                            />
                        </div>
                    </div>
                </>
            )}
        </Seccion>
    );
}

// ---------- Frecuencias de radio ----------
// El resumen general es de administración y gerencia; el resto de roles ve sus alertas pendientes.
const cargarFrecuencias = () =>
    frecuencias
        .obtenerResumen()
        .then((resumen) => ({ resumen }))
        .catch(() => frecuencias.listarAlertas({ atendida: false }).then((alertas) => ({ alertas })));

function SeccionFrecuencias({ onVer }) {
    const { cargando, datos, error } = useCarga(cargarFrecuencias);

    const r = datos?.resumen;
    const alertas = useMemoAlertas(datos?.alertas);

    if (error) return null;

    const dona = r
        ? [
              { name: "Vigentes", value: r.vigentes },
              { name: "Por renovar", value: r.porRenovar },
              { name: "En renovación", value: r.enRenovacion },
              { name: "Vencidas sin renovación", value: r.vencidasSinRenovacion },
          ].filter((d) => d.value > 0)
        : alertas.porTipo;
    const colores = { Vigentes: "#5EB453", "Por renovar": "#E0A526", "En renovación": "#3B82A0", "Vencidas sin renovación": "#C0392B" };
    const urgentes = r ? (r.frecuenciasUrgentes ?? []).map((u) => ({ id: u.idAlerta, texto: u.empresa, detalle: u.frecuencia })) : alertas.urgentes;

    return (
        <Seccion titulo="Frecuencias de radio" icono={Radio} onVer={onVer}>
            {cargando ? <Cargando /> : (
                <>
                    <Tarjetas
                        items={r ? [
                            { titulo: "Frecuencias vigentes", valor: r.vigentes, color: COLORS.greenDark },
                            { titulo: "Por renovar", valor: r.porRenovar },
                            { titulo: "Urgentes (30 días)", valor: r.urgentes, color: r.urgentes > 0 ? COLORS.red : undefined },
                            { titulo: "Alertas pendientes", valor: r.alertasPendientes },
                        ] : [
                            { titulo: "Alertas pendientes", valor: alertas.total },
                            { titulo: "Urgentes", valor: alertas.urgentes.length, color: alertas.urgentes.length > 0 ? COLORS.red : undefined },
                        ]}
                    />
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                        <div className="lg:col-span-2">
                            <DonutCard
                                titulo={r ? "Frecuencias por estado" : "Alertas por tipo"}
                                datos={dona}
                                colores={r ? colores : {}}
                                vacio={r ? "Sin frecuencias registradas" : "No tenés alertas pendientes"}
                            />
                        </div>
                        <div className="lg:col-span-3 rounded-xl p-4" style={{ border: `1px solid ${COLORS.border}` }}>
                            <h3 className="text-xs uppercase tracking-wide mb-3" style={{ color: COLORS.muted, fontWeight: 600 }}>
                                Frecuencias urgentes
                            </h3>
                            {urgentes.length === 0 ? (
                                <p className="text-sm py-8 text-center" style={{ color: COLORS.muted }}>No hay frecuencias urgentes</p>
                            ) : (
                                <ul className="space-y-2">
                                    {urgentes.slice(0, 4).map((u) => (
                                        <li key={u.id} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm" style={{ backgroundColor: COLORS.redTint, color: COLORS.red }}>
                                            <AlertTriangle size={15} className="shrink-0" />
                                            <span className="min-w-0 truncate"><strong>{u.texto}</strong> · {u.detalle}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </>
            )}
        </Seccion>
    );
}

// Resumen de las alertas pendientes de un vendedor: total, urgentes y conteo por tipo.
function useMemoAlertas(lista) {
    return useMemo(() => {
        const items = lista ?? [];
        const porTipo = {};
        items.forEach((a) => {
            const nombre = frecuencias.TIPOS_ALERTA[a.tipo] ?? a.tipo;
            porTipo[nombre] = (porTipo[nombre] ?? 0) + 1;
        });
        return {
            total: items.length,
            urgentes: items.filter((a) => a.urgente).map((a) => ({ id: a.idAlerta, texto: a.empresa, detalle: a.frecuencia })),
            porTipo: Object.entries(porTipo).map(([name, value]) => ({ name, value })),
        };
    }, [lista]);
}

const SECCIONES = {
    tickets: SeccionTickets,
    alquiler: SeccionAlquiler,
    inventario: SeccionInventario,
    frecuencias: SeccionFrecuencias,
};

/**
 * Indicadores y gráficos de la pantalla de inicio. Cada rol ve las secciones que le sirven para su trabajo,
 * en el orden que más le importa, y solo las de los módulos donde tiene permiso de lectura.
 */
export default function IndicadoresInicio({ user, onOpenModule }) {
    const rol = claveDeRol(user.role);
    const claves = (ORDEN_POR_ROL[rol] ?? Object.keys(SECCIONES)).filter((clave) =>
        (user.permisos ?? []).some((p) => p.idModulo === MODULO[clave] && p.lectura)
    );

    if (claves.length === 0) return null;

    return (
        <section className="mt-10" aria-label="Indicadores de tu rol">
            <h2 className="text-lg mb-1" style={{ color: COLORS.charcoal, fontWeight: 600 }}>
                {TITULO_POR_ROL[rol] ?? "Indicadores de tu rol"}
            </h2>
            <p className="text-sm mb-5" style={{ color: COLORS.muted }}>
                Resumen en vivo de los módulos que usás. Los datos se actualizan cada vez que entrás al inicio.
            </p>

            <div className="flex flex-col gap-5">
                {claves.map((clave) => {
                    const Componente = SECCIONES[clave];
                    return <Componente key={clave} onVer={() => onOpenModule(clave)} />;
                })}
            </div>
        </section>
    );
}
