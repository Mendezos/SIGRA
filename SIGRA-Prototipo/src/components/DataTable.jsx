import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import StatusBadge from "./StatusBadge";

const COLORS = {
    green: "#5EB453",
    greenTint: "#EAF6E8",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
};

function selectClass() {
    return "px-3 py-2 rounded-lg text-sm bg-white";
}

export default function DataTable({ columns, rows, onRowClick, searchPlaceholder = "Buscar..." }) {
    const [query, setQuery] = useState("");
    const [estadoFilter, setEstadoFilter] = useState("");
    const [venceHasta, setVenceHasta] = useState("");
    const [showInactive, setShowInactive] = useState(false);

    const hasEstadoColumn = columns.some((c) => c.key === "estado");
    const hasVenceColumn = columns.some((c) => c.key === "vence");
    const hasInactiveRows = rows.some((r) => r.activo === false);

    const estadoOptions = useMemo(() => {
        if (!hasEstadoColumn) return [];
        return [...new Set(rows.map((r) => r.estado).filter(Boolean))];
    }, [rows, hasEstadoColumn]);

    const filtered = useMemo(() => {
        let result = rows;

        if (!showInactive) {
            result = result.filter((row) => row.activo !== false);
        }

        if (estadoFilter) {
            result = result.filter((row) => row.estado === estadoFilter);
        }

        if (venceHasta) {
            const limit = new Date(venceHasta);
            result = result.filter((row) => {
                if (!row.vence || row.vence === "—") return false;
                const d = new Date(row.vence);
                return !Number.isNaN(d.getTime()) && d <= limit;
            });
        }

        if (query.trim()) {
            const q = query.trim().toLowerCase();
            result = result.filter((row) => Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q)));
        }

        return result;
    }, [rows, query, estadoFilter, venceHasta, showInactive]);

    return (
        <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative max-w-xs w-full">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color={COLORS.muted} />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
                        style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}
                    />
                </div>

                {hasEstadoColumn && (
                    <select
                        value={estadoFilter}
                        onChange={(e) => setEstadoFilter(e.target.value)}
                        className={selectClass()}
                        style={{ border: `1px solid ${COLORS.border}`, color: estadoFilter ? COLORS.charcoal : COLORS.muted }}
                    >
                        <option value="">Todos los estados</option>
                        {estadoOptions.map((o) => (
                            <option key={o} value={o}>
                                {o}
                            </option>
                        ))}
                    </select>
                )}

                {hasVenceColumn && (
                    <label className="flex items-center gap-2 text-xs" style={{ color: COLORS.muted }}>
                        Vence antes de
                        <input
                            type="date"
                            value={venceHasta}
                            onChange={(e) => setVenceHasta(e.target.value)}
                            className="px-2.5 py-2 rounded-lg text-sm"
                            style={{ border: `1px solid ${COLORS.border}`, color: COLORS.charcoal }}
                        />
                        {venceHasta && (
                            <button type="button" onClick={() => setVenceHasta("")} style={{ color: COLORS.green }}>
                                Quitar
                            </button>
                        )}
                    </label>
                )}

                {hasInactiveRows && (
                    <label className="flex items-center gap-2 text-xs ml-auto" style={{ color: COLORS.muted }}>
                        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} style={{ accentColor: COLORS.green }} />
                        Mostrar inactivos
                    </label>
                )}
            </div>

            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
                <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ backgroundColor: COLORS.greenTint }}>
                            {columns.map((c) => (
                                <th key={c.key} className="text-left px-4 py-3 text-xs uppercase tracking-wide" style={{ color: COLORS.muted, fontWeight: 600 }}>
                                    {c.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-6 text-center text-sm" style={{ color: COLORS.muted }}>
                                    No hay registros que coincidan con la búsqueda o los filtros.
                                </td>
                            </tr>
                        )}
                        {filtered.map((row, i) => (
                            <tr
                                key={row.id ?? i}
                                onClick={() => onRowClick?.(row)}
                                className="cursor-pointer"
                                style={{ borderTop: `1px solid ${COLORS.border}`, opacity: row.activo === false ? 0.55 : 1 }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#FAFAFA")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                                {columns.map((c) => (
                                    <td key={c.key} className="px-4 py-3" style={{ color: COLORS.charcoal }}>
                                        {c.key === "estado" ? <StatusBadge value={row[c.key]} /> : row[c.key] || "—"}
                                        {c.key === columns[0].key && row.activo === false && (
                                            <span className="ml-2 text-xs" style={{ color: COLORS.muted }}>
                                                (inactivo)
                                            </span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs mt-2" style={{ color: COLORS.muted }}>
                {filtered.length} de {rows.length} registros
            </p>
        </div>
    );
}
