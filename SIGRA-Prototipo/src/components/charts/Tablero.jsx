import { useId, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, Table2, BarChart3 } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLORS } from "../uiTheme";
import { AVISO } from "./paleta";

// Piezas del tablero (DAR): tarjeta con vista de tabla, indicador con comparación, evolución, barras apiladas,
// barra de composición y medidores. Marcas finas, cuadrícula suave y el texto siempre en tinta (nunca en el color de la serie).

const EJE = { fontSize: 11, fill: COLORS.muted };
const CUADRICULA = "#EDF0EB";
const SOMBRA = "0 1px 2px rgba(25,35,25,0.04), 0 8px 24px -18px rgba(25,35,25,0.25)";
const numero = (n) => new Intl.NumberFormat("es-CR").format(n ?? 0);

export function Tarjeta({ titulo, subtitulo, tabla, children, className = "" }) {
    const [verTabla, setVerTabla] = useState(false);
    const id = useId();
    return (
        <section aria-labelledby={id} className={`rounded-2xl bg-white p-5 flex flex-col ${className}`} style={{ border: `1px solid ${COLORS.border}`, boxShadow: SOMBRA }}>
            <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h3 id={id} className="text-sm" style={{ color: COLORS.charcoal, fontWeight: 600 }}>{titulo}</h3>
                    {subtitulo && <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>{subtitulo}</p>}
                </div>
                {tabla && tabla.filas.length > 0 && (
                    <button type="button" onClick={() => setVerTabla((v) => !v)} aria-pressed={verTabla}
                        className="shrink-0 flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 hover:bg-[#F3F7F2]" style={{ color: COLORS.muted, border: `1px solid ${COLORS.border}` }}>
                        {verTabla ? <BarChart3 size={13} /> : <Table2 size={13} />}
                        {verTabla ? "Gráfico" : "Tabla"}
                    </button>
                )}
            </div>
            {verTabla ? <TablaDatos {...tabla} /> : <div className="flex-1">{children}</div>}
        </section>
    );
}

function TablaDatos({ columnas, filas }) {
    return (
        <div className="overflow-auto max-h-72">
            <table className="w-full text-xs">
                <thead>
                    <tr style={{ color: COLORS.muted }}>
                        {columnas.map((c, i) => <th key={c} className={`py-1.5 pr-3 font-medium ${i ? "text-right" : "text-left"}`}>{c}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {filas.map((f, r) => (
                        <tr key={r} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                            {f.map((v, i) => <td key={i} className={`py-1.5 pr-3 ${i ? "text-right tabular-nums" : ""}`}>{v}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function SinDatos({ mensaje }) {
    return <p className="text-sm py-10 text-center" style={{ color: COLORS.muted }}>{mensaje}</p>;
}

// Indicador: número grande, comparación contra un periodo con nombre y minigráfico opcional.
export function Indicador({ titulo, valor, detalle, icono: Icono, color, cambio, periodo = "vs. hace 30 días", subeEsBueno = true, serie }) {
    const idDegradado = useId().replace(/:/g, "");
    const tono = cambio === 0 || cambio == null ? COLORS.muted : (cambio > 0) === subeEsBueno ? AVISO.bien : AVISO.critico;
    const Flecha = !cambio ? Minus : cambio > 0 ? ArrowUpRight : ArrowDownRight;
    return (
        <div className="rounded-2xl bg-white p-4 relative overflow-hidden" style={{ border: `1px solid ${COLORS.border}`, boxShadow: SOMBRA }}>
            <div className="flex items-center gap-2.5">
                {Icono && (
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0" style={{ backgroundColor: `${color}18`, color }}>
                        <Icono size={16} />
                    </span>
                )}
                <p className="text-xs" style={{ color: COLORS.muted, fontWeight: 600 }}>{titulo}</p>
            </div>
            <div className="flex items-end justify-between gap-3 mt-3">
                <p className="text-4xl leading-none" style={{ color: COLORS.charcoal, fontWeight: 700, letterSpacing: "-0.02em" }}>{numero(valor)}</p>
                {serie && serie.length > 1 && (
                    <div className="w-24 h-10 shrink-0" aria-hidden="true">
                        <ResponsiveContainer>
                            <AreaChart data={serie.map((v, i) => ({ i, v }))} margin={{ top: 3, right: 2, left: 2, bottom: 0 }}>
                                <defs>
                                    <linearGradient id={idDegradado} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${idDegradado})`} isAnimationActive />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-1.5 mt-2.5 text-xs min-h-4">
                {cambio != null && (
                    <>
                        <Flecha size={13} style={{ color: tono }} />
                        <span style={{ color: tono, fontWeight: 600 }}>{cambio > 0 ? `+${cambio}` : cambio}</span>
                        <span style={{ color: COLORS.muted }}>{periodo}</span>
                    </>
                )}
                {detalle && <span style={{ color: COLORS.muted }}>{detalle}</span>}
            </div>
        </div>
    );
}

function Globo({ active, payload, label, formatoTitulo }) {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((n, p) => n + (p.value ?? 0), 0);
    return (
        <div className="rounded-xl bg-white px-3.5 py-2.5 text-xs" style={{ border: `1px solid ${COLORS.border}`, boxShadow: "0 10px 30px rgba(25,35,25,0.16)" }}>
            <p className="mb-1.5" style={{ color: COLORS.charcoal, fontWeight: 600 }}>{formatoTitulo ? formatoTitulo(label) : label}</p>
            {payload.map((p) => (
                <p key={p.dataKey} className="flex items-center gap-2 leading-5">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                    <span style={{ color: COLORS.muted }}>{p.name}</span>
                    <span className="ml-auto pl-4 tabular-nums" style={{ color: COLORS.charcoal, fontWeight: 600 }}>{numero(p.value)}</span>
                </p>
            ))}
            {payload.length > 1 && <p className="mt-1.5 pt-1.5 text-right" style={{ borderTop: `1px solid ${COLORS.border}`, color: COLORS.muted }}>Total {numero(total)}</p>}
        </div>
    );
}

export function Leyenda({ series }) {
    return (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
            {series.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.muted }}>
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                    {s.label}
                </li>
            ))}
        </ul>
    );
}

// Evolución en el tiempo: líneas de 2 px con un velo suave, línea guía al pasar el mouse y el último valor rotulado.
export function Evolucion({ datos, categoria, series, formatoEje, formatoTitulo, alto = 280 }) {
    const base = useId().replace(/:/g, "");
    const ultimo = datos.length - 1;
    return (
        <>
            <Leyenda series={series} />
            <div style={{ width: "100%", height: alto }}>
                <ResponsiveContainer>
                    <AreaChart data={datos} margin={{ top: 14, right: 30, left: -18, bottom: 0 }}>
                        <defs>
                            {series.map((s) => (
                                <linearGradient key={s.key} id={`${base}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={s.color} stopOpacity={0.18} />
                                    <stop offset="100%" stopColor={s.color} stopOpacity={0.01} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid stroke={CUADRICULA} vertical={false} />
                        <XAxis dataKey={categoria} tickFormatter={formatoEje} tick={EJE} tickLine={false} axisLine={{ stroke: COLORS.border }} minTickGap={12} />
                        <YAxis allowDecimals={false} tick={EJE} tickLine={false} axisLine={false} />
                        <Tooltip content={<Globo formatoTitulo={formatoTitulo} />} cursor={{ stroke: "#C9D3C6", strokeWidth: 1 }} />
                        {series.map((s) => (
                            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} strokeLinecap="round"
                                fill={`url(#${base}-${s.key})`} dot={false} activeDot={{ r: 5, stroke: "#FFFFFF", strokeWidth: 2 }}>
                                <LabelList dataKey={s.key} content={({ x, y, value, index }) => index === ultimo ? (
                                    <g>
                                        <circle cx={x} cy={y} r={4} fill={s.color} stroke="#FFFFFF" strokeWidth={2} />
                                        <text x={x + 8} y={y + 4} fontSize={12} fontWeight={700} fill={COLORS.charcoal}>{value}</text>
                                    </g>
                                ) : null} />
                            </Area>
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </>
    );
}

// Barras horizontales apiladas con separación de 2 px entre segmentos y el total al final.
export function BarrasApiladas({ datos, categoria, series, alFiltrar }) {
    const conTotal = datos.map((d) => ({ ...d, __total: series.reduce((n, s) => n + (d[s.key] ?? 0), 0) }));
    return (
        <>
            <Leyenda series={series} />
            <div style={{ width: "100%", height: Math.max(130, conTotal.length * 46 + 20) }}>
                <ResponsiveContainer>
                    <BarChart data={conTotal} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barCategoryGap={14}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey={categoria} width={118} tick={{ fontSize: 12, fill: COLORS.charcoal }} tickLine={false} axisLine={false} />
                        <Tooltip content={<Globo />} cursor={{ fill: "rgba(63,155,55,0.06)" }} />
                        {series.map((s, i) => (
                            <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} stroke="#FFFFFF" strokeWidth={2} barSize={22}
                                radius={i === series.length - 1 ? [0, 4, 4, 0] : 0} onClick={alFiltrar ? (d) => alFiltrar(d.payload ?? d) : undefined}
                                cursor={alFiltrar ? "pointer" : undefined}>
                                {i === series.length - 1 && (
                                    <LabelList dataKey="__total" position="right" fill={COLORS.charcoal} fontSize={12} fontWeight={700} />
                                )}
                            </Bar>
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </>
    );
}

// Un todo dividido en partes: barra alta con el porcentaje dentro de cada bloque (reemplaza a la dona).
export function Composicion({ partes }) {
    const total = partes.reduce((n, p) => n + p.valor, 0);
    if (!total) return <SinDatos mensaje="No hay equipos para mostrar." />;
    return (
        <>
            <div className="flex gap-0.5 h-9 w-full" role="img" aria-label={partes.map((p) => `${p.nombre}: ${p.valor}`).join(", ")}>
                {partes.filter((p) => p.valor > 0).map((p) => {
                    const pct = Math.round((p.valor / total) * 100);
                    return (
                        <div key={p.nombre} title={`${p.nombre}: ${p.valor} (${pct}%)`} className="rounded flex items-center px-2 transition-[flex-grow] duration-500 overflow-hidden"
                            style={{ flexGrow: p.valor, flexBasis: 0, backgroundColor: p.color, color: "#FFFFFF" }}>
                            {pct >= 10 && <span className="text-xs whitespace-nowrap" style={{ fontWeight: 700 }}>{pct}%</span>}
                        </div>
                    );
                })}
            </div>
            <ul className="flex flex-col gap-2 mt-4">
                {partes.map((p) => (
                    <li key={p.nombre} className="flex items-center gap-2 text-xs" style={{ color: COLORS.muted }}>
                        <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
                        {p.nombre}
                        <strong className="ml-auto tabular-nums" style={{ color: COLORS.charcoal }}>{p.valor}</strong>
                    </li>
                ))}
            </ul>
        </>
    );
}

// Medidor contra un mínimo: la barra muestra lo disponible y la marca vertical el mínimo requerido.
export function Medidor({ nombre, valor, minimo, estado, icono: Icono, color }) {
    const escala = Math.max(minimo * 2, valor, 1);
    return (
        <div>
            <div className="flex items-baseline justify-between gap-2 text-xs mb-1.5">
                <span style={{ color: COLORS.charcoal, fontWeight: 600 }}>{nombre}</span>
                <span className="flex items-center gap-1" style={{ color }}>
                    {Icono && <Icono size={12} />}
                    <span style={{ fontWeight: 600 }}>{estado}</span>
                </span>
            </div>
            <div className="relative h-2.5 rounded-full" style={{ backgroundColor: `${color}1F` }}>
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, (valor / escala) * 100)}%`, backgroundColor: color }} />
                <span className="absolute -top-1 -bottom-1 w-0.5" title={`Mínimo: ${minimo}`} style={{ left: `${(minimo / escala) * 100}%`, backgroundColor: COLORS.charcoal }} />
            </div>
            <p className="text-[11px] mt-1" style={{ color: COLORS.muted }}>{valor} disponibles · mínimo {minimo}</p>
        </div>
    );
}


