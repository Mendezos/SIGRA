import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
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

function Marco({ titulo, children, alto }) {
    return (
        <div className="rounded-xl p-4" style={{ border: `1px solid ${COLORS.border}` }}>
            {titulo && (
                <h3 className="text-xs uppercase tracking-wide mb-3" style={{ color: COLORS.muted, fontWeight: 600 }}>
                    {titulo}
                </h3>
            )}
            <div style={{ width: "100%", height: alto }}>{children}</div>
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

// Tarjeta de indicador: título, valor grande y color opcional.
export function KpiCard({ titulo, valor, color, detalle }) {
    return (
        <div className="rounded-lg p-4" style={{ backgroundColor: COLORS.greenTint }}>
            <p className="text-xs mb-1" style={{ color: COLORS.muted }}>{titulo}</p>
            <p className="text-2xl" style={{ color: color ?? COLORS.charcoal, fontWeight: 600 }}>{valor}</p>
            {detalle && <p className="text-xs mt-1" style={{ color: COLORS.muted }}>{detalle}</p>}
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

    return (
        <Marco titulo={titulo} alto={alto}>
            <ResponsiveContainer>
                <BarChart
                    data={datos}
                    layout={horizontal ? "vertical" : "horizontal"}
                    margin={{ top: 8, right: 16, left: horizontal ? 24 : 0, bottom: 8 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    {horizontal ? (
                        <>
                            <XAxis type="number" allowDecimals={false} tick={EJE} />
                            <YAxis type="category" dataKey={categoriaKey} tick={EJE} width={110} />
                        </>
                    ) : (
                        <>
                            <XAxis dataKey={categoriaKey} tick={EJE} />
                            <YAxis allowDecimals={false} tick={EJE} />
                        </>
                    )}
                    <Tooltip />
                    {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
                    {series.map((s, i) => (
                        <Bar
                            key={s.key}
                            dataKey={s.key}
                            name={s.label}
                            fill={s.color ?? PALETA[i % PALETA.length]}
                            stackId={apiladas ? "pila" : undefined}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </Marco>
    );
}

// Dona. datos: [{ name, value }]. colores: { [name]: color } opcional.
export function DonutCard({ titulo, datos, colores = {}, alto = 210, vacio }) {
    if (!datos || datos.length === 0) {
        return (
            <Marco titulo={titulo} alto="auto">
                <SinDatos mensaje={vacio} />
            </Marco>
        );
    }

    return (
        <Marco titulo={titulo} alto={alto}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie data={datos} dataKey="value" nameKey="name" innerRadius={42} outerRadius={72} paddingAngle={2}>
                        {datos.map((d, i) => (
                            <Cell key={d.name} fill={colores[d.name] ?? PALETA[i % PALETA.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
            </ResponsiveContainer>
        </Marco>
    );
}

// Líneas (por ejemplo, valores por mes). series: [{ key, label, color }].
export function LineChartCard({ titulo, datos, categoriaKey = "nombre", series, alto = 260, vacio }) {
    if (!datos || datos.length === 0) {
        return (
            <Marco titulo={titulo} alto="auto">
                <SinDatos mensaje={vacio} />
            </Marco>
        );
    }

    return (
        <Marco titulo={titulo} alto={alto}>
            <ResponsiveContainer>
                <LineChart data={datos} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey={categoriaKey} tick={EJE} />
                    <YAxis allowDecimals={false} tick={EJE} />
                    <Tooltip />
                    {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
                    {series.map((s, i) => (
                        <Line
                            key={s.key}
                            type="monotone"
                            dataKey={s.key}
                            name={s.label}
                            stroke={s.color ?? PALETA[i % PALETA.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </Marco>
    );
}
