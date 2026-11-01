import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { COLORS } from "../uiTheme";
import { PALETA } from "./paleta";

// Componentes de gráficos reutilizables (T-03). Todos los módulos los usan para que los
// indicadores se vean igual: tarjeta KPI, barras (simples o apiladas), dona y líneas.

const EJE = { fontSize: 12, fill: COLORS.muted };
const CUADRICULA = "#E8EFE6";

function Marco({ titulo, children, alto }) {
    return (
        <div
            className="rounded-2xl p-5 bg-white"
            style={{ border: `1px solid ${COLORS.border}`, boxShadow: "0 1px 2px rgba(25,35,25,0.04)" }}
        >
            {titulo && (
                <h3 className="flex items-center gap-2 text-xs uppercase tracking-wide mb-4" style={{ color: COLORS.greenDark, fontWeight: 600 }}>
                    <span className="inline-block w-1 h-3.5 rounded-full" style={{ backgroundColor: COLORS.green }} />
                    {titulo}
                </h3>
            )}
            {alto === "auto" ? children : <div style={{ width: "100%", height: alto }}>{children}</div>}
        </div>
    );
}

function SinDatos({ mensaje = "Sin datos para mostrar" }) {
    return (
        <p className="text-sm py-8 text-center" style={{ color: COLORS.muted }}>
            {mensaje}
        </p>
    );
}

// Ventana que aparece al pasar el mouse sobre un gráfico.
function TooltipTarjeta({ active, payload, label }) {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="rounded-xl px-3.5 py-2.5 text-xs bg-white" style={{ border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 24px rgba(25,35,25,0.14)" }}>
            {(label ?? payload[0].payload?.name) && (
                <p className="mb-1.5" style={{ color: COLORS.charcoal, fontWeight: 600 }}>{label ?? payload[0].payload.name}</p>
            )}
            {payload.map((p) => (
                <p key={p.dataKey ?? p.name} className="flex items-center gap-2" style={{ color: COLORS.charcoal }}>
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color ?? p.payload?.fill ?? p.fill }} />
                    <span style={{ color: COLORS.muted }}>{p.name}:</span>
                    <span style={{ fontWeight: 600 }}>{p.value}</span>
                </p>
            ))}
        </div>
    );
}

// Leyenda propia: puntos de color con el nombre y, si se pide, la cantidad.
function Leyenda({ items }) {
    return (
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
            {items.map((i) => (
                <li key={i.nombre} className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.muted }}>
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i.color }} />
                    {i.nombre}
                    {i.valor !== undefined && <strong style={{ color: COLORS.charcoal }}>{i.valor}</strong>}
                </li>
            ))}
        </ul>
    );
}

// Tarjeta de indicador: título, valor grande y color opcional (el color también tiñe la franja lateral).
export function KpiCard({ titulo, valor, color, detalle, icono: Icono }) {
    const acento = color ?? COLORS.green;

    return (
        <div
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{
                background: "linear-gradient(135deg, #F3FAF2 0%, #FFFFFF 70%)",
                border: `1px solid ${COLORS.border}`,
                boxShadow: "0 1px 2px rgba(25,35,25,0.04)",
            }}
        >
            <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ backgroundColor: acento }} />
            <div className="flex items-start justify-between gap-2 pl-2">
                <p className="text-[11px] uppercase tracking-wide" style={{ color: COLORS.muted, fontWeight: 600 }}>{titulo}</p>
                {Icono && <Icono size={16} style={{ color: acento }} />}
            </div>
            <p className="text-3xl mt-1.5 pl-2" style={{ color: color ?? COLORS.charcoal, fontWeight: 600, lineHeight: 1.1 }}>{valor}</p>
            {detalle && <p className="text-xs mt-1.5 pl-2" style={{ color: COLORS.muted }}>{detalle}</p>}
        </div>
    );
}

// Barras. series: [{ key, label, color }]. apiladas=true las junta en una sola barra por categoría.
export function BarChartCard({ titulo, datos, categoriaKey = "nombre", series, apiladas = false, horizontal = false, alto = 280, vacio }) {
    if (!datos || datos.length === 0) {
        return (
            <Marco titulo={titulo} alto="auto">
                <SinDatos mensaje={vacio} />
            </Marco>
        );
    }

    const colorDe = (s, i) => s.color ?? PALETA[i % PALETA.length];
    const radioSuperior = horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0];
    // Con varias categorías los nombres no caben en horizontal (sobre todo en el celular): se inclinan.
    const inclinar = !horizontal && datos.length > 4;

    return (
        <Marco titulo={titulo} alto="auto">
            <div style={{ width: "100%", height: alto }}>
                <ResponsiveContainer>
                    <BarChart
                        data={datos}
                        layout={horizontal ? "vertical" : "horizontal"}
                        margin={{ top: 8, right: 12, left: horizontal ? 8 : -12, bottom: 4 }}
                        barCategoryGap="28%"
                    >
                        <CartesianGrid strokeDasharray="4 4" stroke={CUADRICULA} vertical={horizontal} horizontal={!horizontal} />
                        <XAxis
                            type={horizontal ? "number" : "category"}
                            dataKey={horizontal ? undefined : categoriaKey}
                            allowDecimals={false}
                            tick={EJE}
                            axisLine={horizontal ? false : { stroke: COLORS.border }}
                            tickLine={false}
                            interval={0}
                            angle={inclinar ? -30 : 0}
                            textAnchor={inclinar ? "end" : "middle"}
                            height={inclinar ? 56 : 30}
                        />
                        <YAxis
                            type={horizontal ? "category" : "number"}
                            dataKey={horizontal ? categoriaKey : undefined}
                            allowDecimals={false}
                            tick={EJE}
                            width={horizontal ? 110 : 40}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<TooltipTarjeta />} cursor={{ fill: "rgba(94,180,83,0.08)" }} />
                        {series.map((s, i) => (
                            <Bar
                                key={s.key}
                                dataKey={s.key}
                                name={s.label}
                                fill={colorDe(s, i)}
                                stackId={apiladas ? "pila" : undefined}
                                radius={!apiladas || i === series.length - 1 ? radioSuperior : 0}
                                maxBarSize={44}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
            {series.length > 1 && <Leyenda items={series.map((s, i) => ({ nombre: s.label, color: colorDe(s, i) }))} />}
        </Marco>
    );
}

// Dona. datos: [{ name, value }]. colores: { [name]: color } opcional. Muestra el total al centro y la cantidad de cada parte.
export function DonutCard({ titulo, datos, colores = {}, alto = 190, vacio }) {
    if (!datos || datos.length === 0) {
        return (
            <Marco titulo={titulo} alto="auto">
                <SinDatos mensaje={vacio} />
            </Marco>
        );
    }

    const total = datos.reduce((n, d) => n + d.value, 0);
    const colorDe = (d, i) => colores[d.name] ?? PALETA[i % PALETA.length];

    return (
        <Marco titulo={titulo} alto="auto">
            <div className="relative" style={{ width: "100%", height: alto }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={datos}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="62%"
                            outerRadius="92%"
                            paddingAngle={datos.length > 1 ? 3 : 0}
                            cornerRadius={6}
                            stroke="#FFFFFF"
                            strokeWidth={2}
                        >
                            {datos.map((d, i) => (
                                <Cell key={d.name} fill={colorDe(d, i)} />
                            ))}
                        </Pie>
                        <Tooltip content={<TooltipTarjeta />} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl" style={{ color: COLORS.charcoal, fontWeight: 600, lineHeight: 1 }}>{total}</span>
                    <span className="text-[11px] uppercase tracking-wide mt-1" style={{ color: COLORS.muted }}>Total</span>
                </div>
            </div>
            <Leyenda items={datos.map((d, i) => ({ nombre: d.name, color: colorDe(d, i), valor: d.value }))} />
        </Marco>
    );
}

// Líneas con área suave (por ejemplo, valores por mes). series: [{ key, label, color }].
export function LineChartCard({ titulo, datos, categoriaKey = "nombre", series, alto = 260, vacio }) {
    if (!datos || datos.length === 0) {
        return (
            <Marco titulo={titulo} alto="auto">
                <SinDatos mensaje={vacio} />
            </Marco>
        );
    }

    const colorDe = (s, i) => s.color ?? PALETA[i % PALETA.length];

    return (
        <Marco titulo={titulo} alto="auto">
            <div style={{ width: "100%", height: alto }}>
                <ResponsiveContainer>
                    <AreaChart data={datos} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                        <defs>
                            {series.map((s, i) => (
                                <linearGradient key={s.key} id={`degradado-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={colorDe(s, i)} stopOpacity={0.28} />
                                    <stop offset="100%" stopColor={colorDe(s, i)} stopOpacity={0.02} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke={CUADRICULA} vertical={false} />
                        <XAxis dataKey={categoriaKey} tick={EJE} axisLine={{ stroke: COLORS.border }} tickLine={false} />
                        <YAxis allowDecimals={false} tick={EJE} axisLine={false} tickLine={false} />
                        <Tooltip content={<TooltipTarjeta />} cursor={{ stroke: COLORS.border }} />
                        {series.map((s, i) => (
                            <Area
                                key={s.key}
                                type="monotone"
                                dataKey={s.key}
                                name={s.label}
                                stroke={colorDe(s, i)}
                                strokeWidth={2.5}
                                fill={`url(#degradado-${s.key})`}
                                dot={{ r: 3.5, strokeWidth: 2, fill: "#FFFFFF" }}
                                activeDot={{ r: 5 }}
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            {series.length > 1 && <Leyenda items={series.map((s, i) => ({ nombre: s.label, color: colorDe(s, i) }))} />}
        </Marco>
    );
}
