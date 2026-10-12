import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Modal from "../Modal";
import { Button, FieldLabel, Notice } from "../ui";
import { COLORS, inputClass, inputStyle } from "../uiTheme";
import { ApiError } from "../../services/apiClient";
import * as api from "../../services/inventarioService";

const SERIES = [
    { key: "disponibles", label: "Disponibles", color: "#5EB453" },
    { key: "enUso", label: "En uso (alquilados)", color: "#3B82A0" },
    { key: "enTaller", label: "En taller", color: "#E0A526" },
    { key: "dadosDeBaja", label: "Dados de baja", color: "#C0392B" },
];

function Tarjeta({ titulo, valor, color }) {
    return (
        <div className="rounded-lg p-4" style={{ backgroundColor: COLORS.greenTint }}>
            <p className="text-xs mb-1" style={{ color: COLORS.muted }}>{titulo}</p>
            <p className="text-2xl" style={{ color: color ?? COLORS.charcoal, fontWeight: 600 }}>{valor}</p>
        </div>
    );
}

function MinimoModal({ categoria, onClose, onSaved }) {
    const [valor, setValor] = useState(String(categoria.cantidadMinima));
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    async function guardar(e) {
        e.preventDefault();
        setError("");
        setGuardando(true);
        try {
            await api.guardarStockMinimo(categoria.idCategoria, valor === "" ? null : Number(valor));
            onSaved(`El stock mínimo de ${categoria.categoria} quedó en ${valor}.`);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo guardar el stock mínimo.");
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title="Stock mínimo"
            subtitle={`Categoría ${categoria.categoria}`}
            width="max-w-md"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="form-minimo" disabled={guardando}>
                        {guardando ? "Guardando..." : "Guardar"}
                    </Button>
                </div>
            }
        >
            {error && <Notice tone="error">{error}</Notice>}
            <form id="form-minimo" onSubmit={guardar}>
                <FieldLabel label="Cantidad mínima de equipos disponibles">
                    <input type="number" min="0" step="1" value={valor} onChange={(e) => setValor(e.target.value)} className={inputClass} style={inputStyle} autoFocus />
                </FieldLabel>
                <p className="text-xs mt-2" style={{ color: COLORS.muted }}>
                    Cuando los disponibles lleguen a este valor, la categoría se marcará como bajo el mínimo.
                </p>
            </form>
        </Modal>
    );
}

export default function StockTab({ canConfigure, version }) {
    const [categorias, setCategorias] = useState([]);
    const [modelos, setModelos] = useState([]);
    const [idCategoria, setIdCategoria] = useState("");
    const [idModelo, setIdModelo] = useState("");
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [editando, setEditando] = useState(null);

    const cargar = useCallback(async () => {
        try {
            const [cats, mods] = await Promise.all([api.stockPorCategoria(), api.stockPorModelo()]);
            setCategorias(cats);
            setModelos(mods);
            setError("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "No se pudo cargar el stock.");
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => activo && cargar());
        return () => {
            activo = false;
        };
    }, [cargar, version]);

    const categoriasVisibles = categorias.filter((c) => !idCategoria || String(c.idCategoria) === idCategoria);
    const nombreCategoria = categorias.find((c) => String(c.idCategoria) === idCategoria)?.categoria;
    const modelosDeCategoria = modelos.filter((m) => !nombreCategoria || m.categoria === nombreCategoria);
    const modelosVisibles = modelosDeCategoria.filter((m) => !idModelo || String(m.idModelo) === idModelo);

    const fuenteTotales = idModelo ? modelosVisibles : idCategoria ? categoriasVisibles : categorias;
    const totales = SERIES.reduce((acc, serie) => ({ ...acc, [serie.key]: fuenteTotales.reduce((n, x) => n + x[serie.key], 0) }), {
        total: fuenteTotales.reduce((n, x) => n + x.total, 0),
    });

    const datosGrafico = idModelo || idCategoria
        ? modelosVisibles.map((m) => ({ nombre: `${m.marca} ${m.modelo}`, ...m }))
        : categorias.filter((c) => c.total > 0).map((c) => ({ nombre: c.categoria, ...c }));

    const categoriaSinEquipos = idCategoria && totales.total === 0;

    function alGuardar(texto) {
        setEditando(null);
        setMensaje(texto);
        cargar();
    }

    return (
        <div>
            {mensaje && <Notice>{mensaje}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <select
                    value={idCategoria}
                    onChange={(e) => { setIdCategoria(e.target.value); setIdModelo(""); }}
                    aria-label="Categoría"
                    className="px-3 py-2.5 rounded-lg text-sm bg-white"
                    style={{ ...inputStyle, color: idCategoria ? COLORS.charcoal : COLORS.muted }}
                >
                    <option value="">Todas las categorías</option>
                    {categorias.map((c) => <option key={c.idCategoria} value={c.idCategoria}>{c.categoria}</option>)}
                </select>

                <select
                    value={idModelo}
                    onChange={(e) => setIdModelo(e.target.value)}
                    aria-label="Modelo"
                    className="px-3 py-2.5 rounded-lg text-sm bg-white"
                    style={{ ...inputStyle, color: idModelo ? COLORS.charcoal : COLORS.muted }}
                >
                    <option value="">Todos los modelos</option>
                    {modelosDeCategoria.map((m) => <option key={m.idModelo} value={m.idModelo}>{m.marca} {m.modelo}</option>)}
                </select>
            </div>

            {cargando ? (
                <p className="text-sm" style={{ color: COLORS.muted }}>Cargando stock...</p>
            ) : categoriaSinEquipos ? (
                <div className="rounded-xl p-8 text-center" style={{ backgroundColor: COLORS.greenTint }}>
                    <p className="text-sm font-semibold" style={{ color: COLORS.greenDark }}>
                        No hay equipos registrados en esta categoría
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <Tarjeta titulo="Total de equipos" valor={totales.total} />
                        <Tarjeta titulo="Disponibles" valor={totales.disponibles} color={COLORS.greenDark} />
                        <Tarjeta titulo="En uso (alquilados)" valor={totales.enUso} />
                        <Tarjeta titulo="En taller" valor={totales.enTaller} />
                        <Tarjeta titulo="Dados de baja" valor={totales.dadosDeBaja} color={COLORS.red} />
                    </div>

                    <div className="rounded-xl p-4 mb-6" style={{ border: `1px solid ${COLORS.border}` }}>
                        <h3 className="text-xs uppercase tracking-wide mb-3" style={{ color: COLORS.muted, fontWeight: 600 }}>
                            {idCategoria || idModelo ? "Stock por modelo" : "Stock por categoría"}
                        </h3>
                        <div style={{ width: "100%", height: 280 }}>
                            <ResponsiveContainer>
                                <BarChart data={datosGrafico} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                                    <XAxis dataKey="nombre" tick={{ fontSize: 12, fill: COLORS.muted }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: COLORS.muted }} />
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    {SERIES.map((s) => (
                                        <Bar key={s.key} dataKey={s.key} name={s.label} stackId="stock" fill={s.color} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
                        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ backgroundColor: COLORS.greenTint }}>
                                    {["Categoría", "Total", "Disponibles", "En uso", "En taller", "Dados de baja", "Stock mínimo", ""].map((h) => (
                                        <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wide" style={{ color: COLORS.muted, fontWeight: 600 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {categoriasVisibles.map((c) => {
                                    const bajo = c.cantidadMinima > 0 && c.disponibles <= c.cantidadMinima;
                                    return (
                                        <tr key={c.idCategoria} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                                            <td className="px-4 py-3" style={{ color: COLORS.charcoal, fontWeight: 600 }}>{c.categoria}</td>
                                            <td className="px-4 py-3">{c.total}</td>
                                            <td className="px-4 py-3">{c.disponibles}</td>
                                            <td className="px-4 py-3">{c.enUso}</td>
                                            <td className="px-4 py-3">{c.enTaller}</td>
                                            <td className="px-4 py-3">{c.dadosDeBaja}</td>
                                            <td className="px-4 py-3">
                                                {c.cantidadMinima > 0 ? c.cantidadMinima : <span style={{ color: COLORS.muted }}>Sin definir</span>}
                                                {bajo && (
                                                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: COLORS.redTint, color: COLORS.red, fontWeight: 600 }}>
                                                        Bajo el mínimo
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {canConfigure && (
                                                    <button type="button" className="text-xs" style={{ color: COLORS.greenDark }} onClick={() => { setMensaje(""); setEditando(c); }}>
                                                        Configurar mínimo
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {editando && <MinimoModal categoria={editando} onClose={() => setEditando(null)} onSaved={alGuardar} />}
        </div>
    );
}
